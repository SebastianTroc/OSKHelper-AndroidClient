window.loggedInAPI = false;
window.socket = {};
window.deviceLocation;
window.placeListItems;

var OSK_Helper = {

  init: function() {
    $.mobile.changePage("#splashscreen");
    OSK_Helper.checkPreAuth();
  },

  serverAddress: 'http://' + AppConfig.api_server.host + ':' + AppConfig.api_server.port,

  // save downloaded places to HTML5 WebStorage
  prepareDatabase_Places: function(data) {
    var self = this
    ,   freePlaces = 0; // free places counter


    this.db = openDatabase("oskhelperdb", "1.0", "Place manewrowe", 5*1024*1024);
    this.db.transaction(function(tx){
      tx.executeSql('DROP TABLE IF EXISTS places');
      tx.executeSql('CREATE TABLE IF NOT EXISTS places (id unique, address, name, photo, occupated, coordinates)');
      $.each(data.places, function(index, elem){
        tx.executeSql('INSERT INTO places (id, address, name, photo, occupated, coordinates) VALUES ("'+ elem._id + '", "' + elem.address + '", "' + elem.name + '", "'  + elem.photoBase64 + '", "' + elem.occupated + '", "' + elem.coordinates.lat + ',' + elem.coordinates.lng + '")');
        OSK_Helper.renderPlacesListElem(elem); // render place list item
        freePlaces++; // increment free places count
      });
    },
    function(err) { // callback if error
      console.log(err);
    },
    function() { // callback if success
      OSK_Helper.clickPlaceHandle();

      var placesListHeader = '<li data-role="list-divider">Place manewrowe <span id="places-counter" class="ui-li-count">Wolnych: '+ freePlaces +'</span></li>'
      $('#places-list').prepend(placesListHeader);
      
      $.mobile.changePage("#places");
      OSK_Helper.deviceGeolocation();
      $('#places-list').listview('refresh');
    });
  },

  // downloads places list from API
  getPlacesFromAPI: function() {
    // JSONP for Cross Domain JSON transfer
    var placesJSON;
    
    $('#places-list').empty();
    
    $.getJSON(this.serverAddress + '/api/places?callback=?', function(data){
      placesJSON = data;
      OSK_Helper.prepareDatabase_Places(placesJSON);
    });
  },

  // Renders places list based on JSON from API
  renderPlacesListElem: function(jsonData) {
    var template = $('#placesListElemTmpl').html();
    var html = Mustache.to_html(template, jsonData);
    $('#places-list').append(html);
    window.placeListItems = $('#places-list').find('li');
  },

  // Renders place's details on click at places list element
  renderDetailsTemplate: function(data) {
    var template = $('#placesDetailsElemTmpl').html()
     ,  html = Mustache.to_html(template, data)
     ,  destinationElem = $('#placeDetailsContent');

    destinationElem.html(html);
    destinationElem.find('a').button();

    var map_container = destinationElem.find('#map');
    var placeCenter = [data.thatPlaceCoords.lat, data.thatPlaceCoords.lng];

    this.renderMap(map_container, placeCenter);
  },


  renderMap: function(map_container, coords) {
    var center = new google.maps.LatLng(coords[0], coords[1]);
    var mapOptions = {
          center: center,
          zoom: 14
        };
    var map = new google.maps.Map(map_container[0], mapOptions);
    var marker = new google.maps.Marker({
      position: center,
      map: map
    });
    $('#place-details').on('pageshow', function() {
      google.maps.event.trigger(map, 'resize');
      map.setOptions({ center: center });
    });
  },

  // Signing in handlers
  postLogin: function(u,p) {
    $.ajax({
      url : OSK_Helper.serverAddress + "/api/login",
      type : "get",
      dataType : "jsonp",
      crossDomain: true,
      contentType : "application/json; charset=utf-8",
      data : {username:u,password:p},
      success : function(result, textStatus, jqXHR) {
        window.localStorage["username"] = u;
        window.localStorage["password"] = p;
        window.localStorage["instructor_id"] = result.instructor_id;
        window.localStorage["instructor_name"] = result.instructor_name;
        OSK_Helper.onSuccessLogin();
      },
      error : function(result) {
        alert("Coś się nie zgadza. Spróbuj ponownie.");
        alert(result);
        $("#loginButton").removeAttr("disabled");
        // navigator.notification.alert("Coś się nie zgadza. Spróbuj ponownie.", function() {});
      }
    });
  },

  // Signing in success callback
  onSuccessLogin: function() {
    window.loggedInAPI = true;
    OSK_Helper.getPlacesFromAPI();
    OSK_Helper.openWebSocket();
    OSK_Helper.renderSettingsView();
    //$.mobile.changePage("#places");
  },


  logInAPI: function() {
    var form = $("#loginForm");
    //disable the button so we can't resubmit while we wait
    $("#loginButton",form).attr("disabled","disabled");
    var u = $("#username", form).val();
    var p = $("#password", form).val();
    if(u != '' && p!= '') {
      OSK_Helper.postLogin(u,p);
    } else {
      alert("Proszę wprowadzić poprawne dane logowania...");
      // navigator.notification.alert("Proszę wprowadzić poprawne dane logowania...", function() {});
      $("#loginButton").removeAttr("disabled");
    }
    return false;
  },


  // Auto login if found credentials in WebStorage
  checkPreAuth: function() {
    $("#loginButton",form).on('click', OSK_Helper.logInAPI);
    var form = $("#loginForm");
    if(window.localStorage["username"] != undefined && window.localStorage["password"] != undefined) {
      console.log('checkPreAuth: logged in');
      $("#username", form).val(window.localStorage["username"]);
      $("#password", form).val(window.localStorage["password"]);
      $("#loginButton",form).click();
    } else {
      console.log('checkPreAuth: logged out');
      $.mobile.changePage("#login");
    }
  },


  renderSettingsView: function() {
    var template = $('#settingsTmpl').html();
    var html = Mustache.to_html(template, {
      loggedUserName: window.localStorage["instructor_name"]
    }); 
    $('#settings-view').append(html);

    $('#logout').on('click', OSK_Helper.logout);
  },


  logout: function() {
    window.localStorage.clear();
    $('#settings-view').empty();
    $("#loginButton").removeAttr("disabled");
    console.log('logged out');
    $.mobile.changePage("#login");
  },


  // Interval for update geolocation
  deviceGeolocation: function() {

    var onSuccess = function(position) {
      window.deviceLocation = {
        lat: position.coords.latitude,
        lng: position.coords.longitude
      }

      OSK_Helper.updateDistances();
    };

    var onError = function(error) {
      alert('Nie udało ustalić położenia GPS: '    + error.code    + '\n' +
            'error code: '    + error.code    + '\n' +
            'message: ' + error.message + '\n');
    }
    
    navigator.geolocation.getCurrentPosition(onSuccess, onError);
    var watchID = navigator.geolocation.watchPosition(onSuccess, onError, { 
      enableHighAccuracy: true,
      timeout: 30000,
      maximumAge: 0
    });

  },


  updateDistances: function() {
    var places = window.placeListItems;

    jQuery.each(places, function(index, elem) {
      var el              = $(elem)
      ,   distanceMeter   = el.find('.distance')
      ,   placeCoords     = el.find('a').data('coords')
      ,   newDistance     = 'undefined';
      
      el.gmap3({
        getdistance:{
          options:{ 
            origins: [window.deviceLocation], 
            destinations: [placeCoords],
            travelMode: google.maps.TravelMode.DRIVING
          },
          callback: function(results, status){
            var newDistance = "";
            if (results){
              for (var i = 0; i < results.rows.length; i++){
                var elements = results.rows[i].elements;
                for(var j=0; j<elements.length; j++){
                  switch(elements[j].status){
                    case "OK":
                      var distanceVal     = elements[j].distance.value
                      ,   durationString  = elements[j].duration.text;
                      newDistanceNum = distanceVal;
                      newDistance = (distanceVal >= 1000) ? "<strong>"+ parseFloat(distanceVal/1000).toFixed(2) +"</strong> km" : "<strong>"+ distanceVal +"</strong> m";

                      el.attr('data-distance', distanceVal);
                      el.attr('data-duration', durationString);

                      distanceMeter.html(newDistance);
                      console.log(el.data('distance'));
                      break;

                    case "NOT_FOUND":
                      console.log('The origin and/or destination of this pairing could not be geocoded<br />');
                      break;

                    case "ZERO_RESULTS":
                      console.log('No route could be found between the origin and destination.<br />');
                      break;
                  }
                }
              } 
            } else {
              alert('Problem z połączeniem GPS');
            }
          }
        }
      });

    });
    places.tsort({attr: 'data-distance'}); // sorting elements by distance
  },


  // Establishing Socket.io connection and configure socket's events
  openWebSocket: function() {

    'http://' + AppConfig.api_server.host + ':' + AppConfig.api_server.port

    window.socket = io.connect(AppConfig.api_server.host, {
      port: AppConfig.api_server.port
    });
    var socket = window.socket;

    socket.on('connect',function() {
      console.log('Socket.IO: Client has connected to the server!');
    });

    socket.on('disablePlace', function(data){
      console.log('disablePlace: '+ data.place);
      $('#place_'+data.place).closest('li').addClass('disabled');
    });

    socket.on('enablePlace', function(data){
      console.log('enablePlace: '+ data.place);
      $('#place_'+data.place).closest('li').removeClass('disabled');
    });

    socket.on('disconnect',function() {
      console.log('Socket.IO: The client has disconnected!');
    });
  },


  // getInstructorID: function() {
  //   return window.localStorage["instructor_id"];
  // },


  occupyPlace: function(placeID) {
    // W przyszlosci do tworzenia logow dla admina 
    // i do wyswietlania kto zajmuje plac.
    // Funkcja powyzej tez zakomentowana.
    // Do parametrow ponizej trzeba bedzie dodac tego usera

    // var instructor = OSK_Helper.getInstructorID;
    var socket = window.socket;
    socket.emit('placeIsOccupied', {place: placeID, instructor: window.localStorage["instructor_id"]});
  },

  releasePlace: function(placeID) {
    var socket = window.socket;
    socket.emit('placeIsFree', {place: placeID})
  },


  clickPlaceHandle: function() {
    $('.occupyPlaceTrigger').on('click', function(e){
      e.stopPropagation();
      e.preventDefault();

      var that = $(this)
       ,  thatID = that.data('place')
       ,  thatPlaceCoords = that.data('coords')
       ,  thatContainer = that.closest('li');
       //console.log(thatContainer);

      if ( thatContainer.hasClass('disabled') ) {

        alert('Ten plac jest zajęty!');

      } else {
        var data = {
          thatPlaceID: thatID,
          thatPlaceName: that.find('.place-name').text(),
          thatPlaceCoords: thatPlaceCoords,
          thatPlaceAddress: that.find('.address').text()
        };

        OSK_Helper.occupyPlace(thatID);
        console.log(data);
        OSK_Helper.renderDetailsTemplate(data);
        OSK_Helper.clickReturnPlaces();
        $.mobile.changePage('#place-details', { role: "dialog" });

      }

    })
  },


  clickReturnPlaces: function() {
    $('#releasePlace').on('click', function(){
      var that = $(this)
       ,  thatID = that.data('place');

      var data = {
        thatPlaceID: thatID,
      };

      OSK_Helper.releasePlace(thatID);
      // $.mobile.changePage('back', { transition: "slide" });
      $.mobile.back();
      // OSK_Helper.renderDetailsTemplate(data);
    })
  }


}