// Client-side App
// Load the application once the DOM is ready, using `jQuery.ready`:
$(function() {

  // DOM ready
  // MODELS
  // --------------------------------------------------------
  // Bookmark Model
  var Bookmark = Backbone.Model.extend();

  // Tag Model
  var Tag = Backbone.Model.extend({
    defaults: {
      "tag": null,
      "url": []
    }
  });

  // COLLECTIONS
  // --------------------------------------------------------
  // Bookmark Collection
  var Bookmarks = Backbone.Collection.extend({

    model: Bookmark,
    url: "/api/bookmarks",
    initialize: function() {

    }

  });

  // Tag Collection
  var Tags = Backbone.Collection.extend({

    model: Tag,
    initialize: function() {

    }

  });

  // VIEWS
  // --------------------------------------------------------
  // Single bookmark view
  var BookmarkView = Backbone.View.extend({

    initialize: function(bookmark) {
      this.bookmark = bookmark;
      this.render();
    },

    render: function() {

      var siteName = this.bookmark.get("url").indexOf("www") === -1 ? this.bookmark.get("url").split("//")[1].split(".")[0] : this.bookmark.get("url").split("www.")[1].split(".")[0];

      var bookmarkview = _.template($("#bookmark-view-template").html(), {
        url: siteName.charAt(0).toUpperCase() + siteName.slice(1),
        tags: this.bookmark.get("tags")
      }).replace("#", this.bookmark.get("url"));
      this.el = bookmarkview;
      return this;
    }


  });

  // Single tag view
  var TagView = Backbone.View.extend({

    initialize: function(tag) {
      this.tag = tag;
      this.render();
    },

    render: function() {
      var tagview = _.template($("#tag-view-template").html(), this.tag.attributes);
      this.el = tagview;
      return this;
    }

  });

  var TagListView = Backbone.View.extend({

    el: $("#tags ul"),

    events: {
      'click a.tag': 'tagClicked',
      'click a.show-all': 'showAllBookmarks'
    },

    initialize: function(tags) {
      this.tags = tags;
      this.tagChosen = null;

      // Bindings
      _.bindAll(this, "addTag", "render", "tagClicked", "showAllBookmarks");
      if (this.tags) {
        this.tags.bind('add', this.addTag);
        this.render();
      };

    },

    addTag: function(tag) {
      var tag = new TagView(tag);
      $(this.el).append(tag.el);
    },

    render: function() {

      // clear
      $(this.el).empty();

      // Show all bookmarks
      $(this.el).append("<li><a href='#' class='show-all'>Show All</a></li>")

      // Render tag view
      this.tags.each(this.addTag)

      return this;

    },

    // when user click on tag
    tagClicked: function(e) {

      this.tagChosen = $(e.currentTarget).html();

      // make it look active
      $("#tags li").removeClass("active");
      $($(e.currentTarget).parent()).addClass("active");

      var bookmarks = this.tags.where({
        tag: this.tagChosen
      })[0].attributes.bookmarks;

      App.bookmarkListView.renderBookmarksByTag(bookmarks);
    },

    showAllBookmarks: function(e) {

      this.tagChosen = null;

      // make it look active
      $("#tags li").removeClass("active");
      $($(e.currentTarget).parent()).addClass("active");

      // var bookmarks = this.tags.indexOf(",") === -1 ? this.tags : _.uniq(_.reduce(_.pluck(this.tags.toJSON(), "bookmarks"), function(memo, b) {
      //     return memo + "," + b;
      //   }).split(","));

      // App.bookmarkListView.renderBookmarksByTag(bookmarks);

      App.bookmarkListView.renderAllBookmarks();

    }

  });


  var BookmarkListView = Backbone.View.extend({

    el: $(".bookmarks"),

    events: {
      "click .icon-wrench": "triggerBookmarkMenu",
      'click .icon-remove': 'removeBookmark',
      'click .icon-pencil': 'showBookmarkUpdater'
    },

    initialize: function() {

      // Declare new collection of bookmarks
      this.bookmarks = new Bookmarks();
      this.tags = null;

      // Bindings
      _.bindAll(this, "addBookmark", "afterFetch", "renderAllBookmarks");
      this.bookmarks.bind('add', this.addBookmark);
      this.bookmarks.bind('reset', this.afterFetch);
      this.bookmarks.bind('remove', this.renderAllBookmarks);

      // Fetch bookmarks from database
      this.bookmarks.fetch();

    },

    addBookmark: function(bookmark) {
      var bookmark = new BookmarkView(bookmark);

      var tagChose = App.tagListView ? App.tagListView.tagChosen : undefined;

      if (_.indexOf(bookmark.attributes.tags.split(","), tagChose) != -1 || tagChose === null) {
        $("#bookmarks ul").append(bookmark.el);
      };

    },

    afterFetch: function() {

      // Create an inverted list of tag -> [bookmark]
      this.processBookmarks();

      // Render tags view
      App.initTagListView(this.tags);

      // Render bookmarks view
      this.renderAllBookmarks();

      return this;

    },

    // Create an inverted list of tag -> [bookmark]
    processBookmarks: function() {

      if (this.bookmarks.length) {

        var self = this;

        // Get tags
        var allTags = _.map(_.uniq(_.reduce(_.pluck(this.bookmarks.toJSON(), "tags"), function(initial, tag) {
          return initial + "," + tag
        }).split(",")), function(tag) {
          return {
            "tag": tag
          }
        });

        // Assign bookmarks
        _.each(allTags, function(tag) {

          tag.bookmarks = [];

          _.each(self.bookmarks.models, function(bookmark) {
            var b = bookmark.attributes;
            var btags = b.tags.split(",");

            if (_.indexOf(btags, tag.tag) != -1) {
              tag.bookmarks.push(b.url);
            };

          })

        });

        this.tags = new Tags(allTags);

      };

    },

    renderBookmarksByTag: function(bookmarks) {

      // clear existing
      $("#bookmarks ul li").remove();

      // if rendering bookmarks by tag
      if (bookmarks) {

        var bookmarksByTag = new Bookmarks(_.filter(this.bookmarks.models, function(bookmark) {
          return _.indexOf(bookmarks, bookmark.get("url")) != -1;
        }));

        bookmarksByTag.each(this.addBookmark);
      } else {
        this.renderAllBookmarks();
      }
    },

    renderAllBookmarks: function() {
      // clear existing
      $("#bookmarks ul li").remove();

      this.bookmarks.each(this.addBookmark);
    },

    triggerBookmarkMenu: function() {

      var toggleWiggle = function() {
        if ($("li.bookmark").hasClass("wiggler")) {
          $("li.bookmark").removeClass("wiggler");
        }
        else {
          $("li.bookmark").addClass("wiggler");
        }
      }

      // allow the user to update or delete bookmarks
      $(".bookmark-menu").toggle();

      // toggleWiggle();

    },

    removeBookmark: function(e) {
      var url = $($($(e.currentTarget).parent()).next()).attr("href");

      var bookmark = this.bookmarks.where({
        url: url
      })[0];

      var self = this;

      $.ajax({
        url: "/api/delete/bookmarks/" + bookmark.get("_id"),
        type: "POST",
        success: function(data, textStatus, jqXHR) {
          // remove on client side models
          self.bookmarks.remove(bookmark);

          self.processBookmarks();

          App.tagListView.tags = this.tags;
          App.tagListView.render();
        }
      });

    },

    showBookmarkUpdater: function(e) {

      var url = $($($(e.currentTarget).parent()).next()).attr("href");

      var bookmark = this.bookmarks.where({
        url: url
      })[0];

      $(".bookmarks-adder").hide();
      $(".bookmarks-updater").show();

      this.populateBookmark(bookmark);

    },

    hideBookmarkUpdater: function() {
      $(".bookmarks-adder").show();
      $(".bookmarks-updater").hide();
    },

    populateBookmark: function(bookmark) {

      // get id
      var id = bookmark.get("_id");

      // get url
      var url = bookmark.get("url");

      // get tags
      var tags = bookmark.get("tags").split(",");

      // populate
      $("input.url").val(url);

      _.each(tags, function(tag) {
        var tagli = _.template($("#tag-selected-template").html(), {
          "tagEntered": tag
        });

        $("li.tag-input-field").before(tagli);

      });

      App.updateBookmarkView.bookmark = bookmark;

    }

  });

  // Add new bookmark view
  var BookmarkAdderView = Backbone.View.extend({

    el: $(".bookmarks-adder"),

    events: {
      "keyup .tag-entry": "tagSelected",
      "keydown .tag-entry": "handleBackspace",
      "keyup input": "saveOnEnter",
      "click div.tag": "initTagEntry",
      "blur div.tag": "endTagEntry",
      "click .save-bookmark": "saveBookmark"
    },

    initialize: function() {
      _.bindAll(this, "saveBookmark");
      return this;
    },

    initTagEntry: function() {

      $("div.tag").addClass("active");
      $(".tag-entry").focus();

    },

    endTagEntry: function() {

      $("div.tag").removeClass("active");

    },

    saveOnEnter: function(e) {

      if (e.keyCode === 13) {
        this.saveBookmark();
      };

    },

    saveBookmark: function(e) {
      var url = $("input.url").val();

        // console.log($(".tags-selected li span"))
      //   var tags = $(".tags-selected li span").html().indexOf(",") === -1 ? $(".tags-selected li span").html() : _.map($(".tags-selected li span"), function(tag) {
      //   return $(tag).html();
      // }).join(",");

        var tags = _.map($(".tags-selected.update li span"), function(tag) {
          return $(tag).html();
        }).join(",");


      // if not empty, save
      if (url && tags) {

        // Validation with regex
        var validUrl = /\/\/(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-\/]))?/.test(url);
        
        if (validUrl) {
          // Save
          $.post("/api/bookmarks", {
            "url": url,
            "tags": tags
          }, function(data, textStatus, jqXHR) {
            // Add to models on client side
            App.bookmarkListView.bookmarks.add(data);
            App.bookmarkListView.processBookmarks();

            // Re render tag list
            if (!App.tagListView) {
              App.initTagListView(App.bookmarkListView.tags);
            }
            else {
              App.tagListView.tags = App.bookmarkListView.tags;
              App.tagListView.render();
            }

          })

          // Clear input
          $("input.url").val('');
          $("li.selected-tag").remove();
        };

      };

    },

    handleBackspace: function(e) {

      if(e.keyCode === 8){ // handles backspace

        var entryMode = false;
        if ($(".tag-entry").val().length > 0) {
          entryMode = true;
        }

        if ($(".tag-entry").val().length === 0 && !entryMode) {

          var currentTags = $(".tags-selected li");
          $($(currentTags)[currentTags.length - 2]).remove();

          entryMode = !entryMode;
        };
      }

    },

    tagSelected: function(e) {

      // if the user typed comma
      if (e.keyCode === 188) {

        // get tag entered
        var tagEntered = $.trim($(".tag-entry").val().replace(/,/g, ""));

        if (tagEntered.length) {
          // tag li
          var tagli = _.template($("#tag-selected-template").html(), {
            "tagEntered": tagEntered
          });

          // prepend
          $("li.tag-input-field").before(tagli);

          // clear tag input
          $(".tag-entry").val('');
        }
        else {

          // clear tag input
          $(".tag-entry").val('');
        }

      }
    }

  });

// Update bookmark view
var BookmarkUpdaterView = Backbone.View.extend({

  el: $(".bookmarks-updater"),

  events: {
    "keyup .tag-entry.update": "tagSelected",
    "keydown .tag-entry.update": "handleBackspace",
    "keyup input": "saveOnEnter",
    "click div.tag.update": "initTagEntry",
    "blur div.tag.update": "endTagEntry",
    "click .update-bookmark": "updateBookmark"
  },

  initialize: function() {
    _.bindAll(this, "updateBookmark");
    return this;
  },

  initTagEntry: function() {

    $("div.tag").addClass("active");
    $(".tag-entry").focus();

  },

  endTagEntry: function() {
    $("div.tag").removeClass("active");
  },

  saveOnEnter: function(e) {

    if (e.keyCode === 13) {
      this.updateBookmark();
    };

  },

  updateBookmark: function(e) {
    var self = this;
    var url = $("input.url").val();
    var tags = _.map($(".tags-selected.update li span"), function(tag) {
      return $(tag).html();
    }).join(",");

    // if not empty, save
    if (url && tags) {

      // Validation with regex
      var validUrl = /\/\/(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-\/]))?/.test(url);
      
      if (validUrl) {
        // Update a single bookmark
        $.ajax({
          url: "/api/update/bookmarks/" + self.bookmark.get("_id"),
          type: "POST",
          data: {
              "url": url
            , "tags": tags
          },
          success: function(data, textStatus, jqXHR) {
            self.bookmark.set(data);
            App.bookmarkListView.processBookmarks();
            App.bookmarkListView.renderAllBookmarks();

            // Re render tag list
            App.tagListView.tags = App.bookmarkListView.tags;
            App.tagListView.render();

            // remove update view
            App.bookmarkListView.hideBookmarkUpdater();
          }
        });

        // Clear input
        $("input.url").val('');
        $("li.selected-tag").remove();
      };

    };

  },

  handleBackspace: function(e) {

    if(e.keyCode === 8){ // handles backspace

      var entryMode = false;
      if ($(".tag-entry.update").val().length > 0) {
        entryMode = true;
      }

      if ($(".tag-entry.update").val().length === 0 && !entryMode) {

        var currentTags = $(".tags-selected.update li");
        $($(currentTags)[currentTags.length - 2]).remove();

        entryMode = !entryMode;
      };
    }

  },

  tagSelected: function(e) {

    // if the user typed comma
    if (e.keyCode === 188) {

      // get tag entered
      var tagEntered = $.trim($(".tag-entry.update").val().replace(/,/g, ""));

      if (tagEntered.length) {

        // tag li
        var tagli = _.template($("#tag-selected-template").html(), {
          "tagEntered": tagEntered
        });

        // prepend
        $("li.tag-input-field.update").before(tagli);

        // clear tag input
        $(".tag-entry.update").val('');
      }
      else {

        // clear tag input
        $(".tag-entry.update").val('');
      }

    }
  }

});


  // App View
  var AppView = Backbone.View.extend({

    el: $("#app"),

    initialize: function() {
      // Initiate views
      this.initBookmarkListView();
      this.initAddBookmarkView();
      this.initUpdateBookmarkView();
    },

    initBookmarkListView: function() {
      this.bookmarkListView = new BookmarkListView();

    },

    initAddBookmarkView: function() {
      this.addBookmarkView = new BookmarkAdderView();

    },

    initUpdateBookmarkView: function() {
      this.updateBookmarkView = new BookmarkUpdaterView();

    },

    initTagListView: function(tags) {
      this.tagListView = new TagListView(tags);

    }

  })


  // INIT
  // --------------------------------------------------------
  window.App = new AppView();

  // Test API
  // Create a single bookmark
  // $.post("/api/bookmarks", {
  //     "url": "codeigniter.com"
  //   , "tags": "php,framework,code"
  // }, function(data, textStatus, jqXHR) {
  //   console.log("Post response:"); console.dir(data); console.log(textStatus); console.dir(jqXHR);
  // })
  // Get
  // $.get("/api/bookmarks", function(data, textStatus, jqXHR) {
  //   console.log(data)
  // });
  // Update a single bookmark
  // $.ajax({
  //   url: "/api/update/bookmarks/4fecd7decfaa572603000008",
  //   type: "POST",
  //   data: {
  //       "url": "www.backbonejs.org"
  //     , "tags": "mvc;backbonejs;javascript;jQuery"
  //   },
  //   success: function(data, textStatus, jqXHR) {
  //     console.log(data);
  //   }
  // });
  // Delete
  // $.ajax({
  //   url: "/api/delete/bookmarks/4fecd6f3cfaa572603000002",
  //   type: "POST",
  //   success: function(data, textStatus, jqXHR) {
  //     console.log(data);
  //   }
  // });
})