window.loggedInAPI = false;
window.socket = {};

var OSK_Helper = {

	init: function() {
    $.mobile.changePage("#splashscreen");
		OSK_Helper.checkPreAuth();
	},

	// serverAddress: 'http://oskhelper.eu01.aws.af.cm',
	serverAddress: 'http://localhost:3000',

  // save downloaded places to HTML5 WebStorage
	prepareDatabase_Places: function(data) {
		var self = this
    ,   freePlaces = 0; // free places counter
	  this.db = openDatabase("oskhelperdb", "1.0", "Place manewrowe", 5*1024*1024);
	  this.db.transaction(function(tx){
  		tx.executeSql('DROP TABLE IF EXISTS places');
      tx.executeSql('CREATE TABLE IF NOT EXISTS places (id unique, address, name, photo, occupated)');
      $.each(data.places, function(index, elem){
				tx.executeSql('INSERT INTO places (id, address, name, photo, occupated) VALUES ("'+ elem._id + '", "' + elem.address + '", "'	+ elem.name + '", "'	+ elem.photo + '", "'	+ elem.occupated + '")');
				OSK_Helper.renderPlacesList(elem); // render place list item
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
      $('#places-list').listview('refresh');
    });
	},

  // downloads places list from API
	getPlacesFromAPI: function() {
		// JSONP for Cross Domain JSON transfer
		var placesJSON;
		$.getJSON(this.serverAddress + '/api/places?callback=?', function(data){
			placesJSON = data;
			OSK_Helper.prepareDatabase_Places(placesJSON);
		});
	},

  // Renders places list based on JSON from API
	renderPlacesList: function(jsonData) {
		var template = $('#placesListElemTmpl').html();
		var html = Mustache.to_html(template, jsonData);
		$('#places-list').append(html);
	},

  // Renders place's details on click at places list element
  renderDetailsTemplate: function(data) {
    var template = $('#placesDetailsElemTmpl').html()
     ,  html = Mustache.to_html(template, data)
     ,  destinationElem = $('#placeDetailsContent');

    destinationElem.html(html);
    destinationElem.find('a').button();
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
        console.log(result);
        OSK_Helper.onSuccessLogin();
      },
      error : function(result) {
        alert("Coś się nie zgadza. Spróbuj ponownie.");
        alert(result);
      	$("#submitButton").removeAttr("disabled");
      	// navigator.notification.alert("Coś się nie zgadza. Spróbuj ponownie.", function() {});
      }
  	});
	},

  // Signing in success callback
  onSuccessLogin: function() {
    window.loggedInAPI = true;
    OSK_Helper.getPlacesFromAPI();
    OSK_Helper.openWebSocket();
    //$.mobile.changePage("#places");
  },


	logInAPI: function() {
		var form = $("#loginForm");
    //disable the button so we can't resubmit while we wait
    $("#submitButton",form).attr("disabled","disabled");
    var u = $("#username", form).val();
    var p = $("#password", form).val();
    if(u != '' && p!= '') {
			OSK_Helper.postLogin(u,p);
    } else {
  		alert("Proszę wprowadzić poprawne dane logowania...");
      // navigator.notification.alert("Proszę wprowadzić poprawne dane logowania...", function() {});
      $("#submitButton").removeAttr("disabled");
    }
    return false;
  },


  // Auto login if found credentials in WebStorage
  checkPreAuth: function() {
  	$("#submitButton",form).click(OSK_Helper.logInAPI);
    var form = $("#loginForm");
    if(window.localStorage["username"] != undefined && window.localStorage["password"] != undefined) {
    	// console.log('checkPreAuth: logged in');
      $("#username", form).val(window.localStorage["username"]);
      $("#password", form).val(window.localStorage["password"]);
      $("#submitButton",form).click();
    // } else {
    	// console.log('checkPreAuth: logged out');
    }
	},


  // Establishing Socket.io connection and configure socket's events
  openWebSocket: function() {
    // window.socket = io.connect('localhost', {
    //   port: 3000
    // });
    window.socket = io.connect('oskhelper.eu01.aws.af.cm', {
      port: 80
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
    socket.emit('placeIsOccupied', {place: placeID});
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
       ,  thatCoords = that.data('coords')
       ,  thatContainer = that.closest('li');
       console.log(thatContainer);

      if ( thatContainer.hasClass('disabled') ) {

        alert('Ten plac jest zajęty!');

      } else {
        var data = {
          thatPlaceID: thatID,
          thatPlaceName: that.find('.place-name').text(),
          thatPlaceCoords: thatCoords,
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