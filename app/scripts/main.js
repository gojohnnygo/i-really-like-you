"use strict";

// wrap code in IIFE keep global space un-polluted
(function() { 
  var likedEndpoint = "https://api.instagram.com/v1/users/self/media/liked?";
  var recentEndpoint = "https://api.instagram.com/v1/users/self/media/recent/?";
  var mediaEndpoint = "https://api.instagram.com/v1/media/";
  var accessToken = "";

  // 1042373039268229955_269685443
  
  var liked = {};
  liked.lookup = {};
  liked.sorted = [];

  if (window.location.hash) {
    accessToken = window.location.hash.substr(1);
    $(".marketing").toggleClass("removed");
    $(".main").toggleClass("removed");
    
    $(".header").addClass("animated fadeIn");
    $(".main").addClass("animated fadeIn");
    
  } else {
    window.location.hash = " ";
    // $(".header").addClass("animated fadeOut");
    $(".marketing").addClass("animated fadeIn");
  }

  var getMedia = function(url, cb) {
    console.log('getMedia');

    return $.ajax({
      method: "GET",
      dataType: "jsonp",
      url: url
    })
    .done(function(data) {
      return cb(data);
    })
    .fail(function(err) {
      console.log(err);
      return err;
    });
  }

  var likedCb = function(data) {
    console.log('likedCb');

    incrementLikedCount(data);

    var nextUrl = data.pagination.next_url
    
    if (nextUrl) {
      setTimeout(function() {
        getMedia(nextUrl, likedCb);
      }, 100);
    } else {
      sortLiked();
      addLikedToDom();
      recentEndpoint += accessToken;
      getMedia(recentEndpoint, recentCb);
    };
  }

  var recentCb = function(data) {
    console.log('recentCb');

    var media = data.data;
    var nextUrl = data.pagination.next_url
    
    var promisedMediaUrls = media.map(function(medium) {
      var mediumUrl = mediaEndpoint + medium.id + "/likes/?" + accessToken;
      
      return getMedia(mediumUrl, incrementLikedBackCount);
    });

    Promise.all(promisedMediaUrls)
    .then(function() {
      if (nextUrl) {
        getMedia(nextUrl, recentCb);
      } else {
        console.log(liked)
        $( '#fixed' ).fixedsticky();
      }
    })
  }

  var incrementLikedCount = function(data) {
    console.log("incrementLikedCount")
    
    var photos = data.data;

    photos.forEach(function(photo) {
      var lookup = liked.lookup;
      var user = photo.user;

      user.totalLiked = lookup[user.id] ? lookup[user.id].totalLiked += 1 : 1;
      user.totalLikedBack = 0;

      lookup[user.id] = user;
    });
  }

  var incrementLikedBackCount = function(data) {
    console.log("incrementLikedBackCount");

    var likers = data.data;

    likers.forEach(function(liker, i) {
      if (liked.lookup[liker.id]) {
        liked.lookup[liker.id].totalLikedBack += 1;
      } else {
        liker.totalLiked = 0;
        liker.totalLikedBack = 1;
        liked.lookup[liker.id] = liker;
      }
    });
  }

  var sortLiked = function() {
    var lookup = liked.lookup;
    var sorted = liked.sorted;

    for (var user in lookup) {
      sorted.push(lookup[user]);
    }

    sorted.sort(function(a, b) {
      if (a.totalLiked < b.totalLiked) {
        return 1;
      }

      if (a.totalLiked > b.totalLiked) {
        return -1;
      }

      return 0;
    });
  }

  var addLikedToDom = function() {
    var html = ""

    liked.sorted.map(function(user) {
      var dataId = "data-id='" + user.id + "'";
      var src = "src='" + user.profile_picture + "'";
      var alt = "alt='" + user.username + "'";
      var title = "title='" + user.username + "'";

      html += "<div class='img-cont'><img " + dataId + " " + src + " " + alt + " " + title + "></div>";
    });

    $(".liked").html(html);
    $(".img-cont").addClass("animated fadeIn");
  }

  $(".liked").on("click", "img", function(evt) {
    var userId = $(this).attr("data-id"); 
    var username = liked.lookup[userId].username;
    var totalLiked = liked.lookup[userId].totalLiked;
    var totalLikedBack  = liked.lookup[userId].totalLikedBack;

    
    var base = totalLiked + totalLikedBack;
    var likedRate = Math.round((totalLiked / base) * 100) + "%"; 
    var likedBackRate = Math.round((totalLikedBack / base) * 100) + "%";

    var pluralLiked = totalLiked === 1 ? "s" : "";
    var pluralLikedBack = totalLikedBack === 1 ? "s" : "";

    $(".progress-bar-success").css("width", likedRate);
    $(".progress-bar-danger").css("width", likedBackRate);

    $(".progress-bar-success").text("You've liked " + username + "<strong>" + totalLiked + "</strong>time" + pluralLiked);
    $(".progress-bar-danger").text(username + " has liked you <strong>" + totalLikedBack + "</strong>time" + pluralLikedBack);
  });

  var getLiked = function() {
    getMedia(likedEndpoint, likedCb);
  }

  var authInstagram = function() {
    if (window.location.hash) {
      accessToken = window.location.hash.substr(1);
      likedEndpoint += accessToken;
      getLiked();
    }
  }

  window.onhashchange = authInstagram();
})();