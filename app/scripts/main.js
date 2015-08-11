'use strict';

// wrap code in IIFE keep global space un-polluted
(function() {
  var likedEndpoint = 'https://api.instagram.com/v1/users/self/media/liked?';
  var recentEndpoint = 'https://api.instagram.com/v1/users/self/media/recent/?';
  var mediaEndpoint = 'https://api.instagram.com/v1/media/';
  var accessToken = '';

  var liked = {};
  liked.lookup = {};
  liked.sorted = [];

  /*
  After processing Instagram data, all elements to the DOM.
   */
  var addLikedToDom = function() {
    var html = '';

    liked.sorted.map(function(user) {
      var dataId = 'data-id="' + user.id + '"';
      var src = 'src="' + user.profile_picture + '"';
      var alt = 'alt="' + user.username + '"';
      var title = 'title="' + user.username + '"';

      html += '<div class="img-cont"><img ' + dataId + ' ' + src + ' ' + alt + ' ' + title + '></div>';
    });

    $('.liked-grid').html(html);
    $('.img-cont').addClass('animated fadeIn');
  };

  /*
  Sort Instagram data by who the auth-ed user has liked the most.
   */
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
  };

  /*
  Access point for Instagram API.
  */
  var instagramRequest = function(url) {
    return Promise.resolve(
      $.ajax({
        method: 'GET',
        dataType: 'jsonp',
        url: url
      })
    );
  };

  /*
  Count all likers for the auth-ed user by media. This requires an
  API call for each medium. Note, this is step 2 of 2. To get total 
  liker count, the first step is to get media IDs. Then a separate 
  call is need to get all likers for each medium.
   */
  var incrementLikedBackCount = function(data) {
    data.forEach(function(photo) {
      photo.data.forEach(function(liker) {
        if (liked.lookup[liker.id]) {
          liked.lookup[liker.id].totalLikedBack += 1;
        } else {
          liker.totalLiked = 0;
          liker.totalLikedBack = 1;
          liked.lookup[liker.id] = liker;
        }
      });
    });

    return data;
  };

  /*
  Get auth-ed user media. Each request to Instagram returns an array
  of media. The Instagram API needs to be called again for each medium.
  This is step 1 of 2 to get total liker count.
   */
  var getMedia = function(data) {
    var media = data.data;

    var promisedMediaUrls = media.map(function(medium) {
      var mediumUrl = mediaEndpoint + medium.id + '/likes/?' + accessToken;

      return instagramRequest(mediumUrl);
    });

    return Promise.all(promisedMediaUrls)
    .then(function(likers) {
      likers.next_url = data.pagination.next_url;

      return likers;
    })
    .catch(function(err) {
      console.log('catch err', err);
      return err;
    });
  };

  /*
  Init process to get likers.

  TODO: better error handling
   */
  var getRecent = function(url) {
    instagramRequest(url)
    .then(getMedia)
    .then(incrementLikedBackCount)
    .then(function(data) {
      var nextUrl = data.next_url;

      getRecent(nextUrl);
    })
    .catch(function() {
      $('#overlay').modal('hide');
      console.log('done!', liked);
    });
  };

  /*
  Count liked from auth-ed user by unique user.
   */
  var incrementLikedCount = function(data) {
    var photos = data.data;

    photos.forEach(function(photo) {
      var lookup = liked.lookup;
      var user = photo.user;

      user.totalLiked = lookup[user.id] ? lookup[user.id].totalLiked += 1 : 1;
      user.totalLikedBack = 0;
      lookup[user.id] = user;
    });

    return data;
  };

  /*
  Init process to get liked.

  TODO: better error handling
   */
  var getLiked = function(url) {
    instagramRequest(url)
    .then(incrementLikedCount)
    .then(function(data) {
      var nextUrl = data.pagination.next_url;

      getLiked(nextUrl);
    })
    .catch(function() {
      $('#overlay h1').text('Almost there...');
      sortLiked();
      addLikedToDom();

      recentEndpoint += accessToken;
      getRecent(recentEndpoint);
    });
  };

  /*
  Initializes the dashboard view after user auth with Instagram.
   */
  var initMainElements = function() {
    $('#overlay').modal('show');

    $('.marketing').toggleClass('removed');
    $('.main').toggleClass('removed');

    $('.dashboard').toggleClass('removed').addClass('animated fadeIn');
    $('.header').addClass('animated fadeIn');
  };

  /*
  Simple logic for client side Instagram auth. This kicks off initial Instagram
  API requests.
   */
  var authInstagram = function() {
    if (window.location.hash) {
      accessToken = window.location.hash.substr(1);
      likedEndpoint += accessToken;
      getLiked(likedEndpoint);
    }
  };

  /*
  Interaction handler for when user clicks on liked.
   */
  var clickHandler = function() {
    var userId = $(this).attr('data-id');
    var user = liked.lookup[userId];

    var base = user.totalLiked + user.totalLikedBack;
    var likedRate = Math.round((user.totalLiked / base) * 100) + '%';
    var likedBackRate = Math.round((user.totalLikedBack / base) * 100) + '%';

    $('.total-likes p').text(base);
    $('.your-likes p').text(user.totalLiked);
    $('.their-likes p').text(user.totalLikedBack);
    $('.their-likes h2').text(user.username + ' Likes');

    $('.progress-bar-success').css('width', likedRate);
    $('.progress-bar-danger').css('width', likedBackRate);
  };

  /*
  Detect URL hash change. This identifies Instagram auth.
   */
  window.onhashchange = authInstagram();

  /*
  Event listener for dashboard clicks.
   */
  $('.liked-grid').on('click', 'img', clickHandler);

  /*
  Check URL to see if user is already authenticated.
   */
  if (window.location.hash) {
    accessToken = window.location.hash.substr(1);
    initMainElements();
  } else {
    window.location.hash = ' ';
    $('.marketing').addClass('animated fadeIn');
  }
})();
