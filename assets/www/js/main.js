window.loggedInAPI = false;
window.socket = {};

var OSK_Helper = {

	init: function() {
		OSK_Helper.checkPreAuth();
	},

	serverAddress: 'http://oskhelper.eu01.aws.af.cm',
	// serverAddress: 'http://localhost:3000',

  // Zapisuje pobrane place do HTML5 Web SQL
	prepareDatabase_Places: function(data) {
		var self = this;
		// console.log('prepareDatabase_Places start');
	  this.db = openDatabase("oskhelperdb", "1.0", "Place manewrowe", 5*1024*1024);
	  this.db.transaction(function(tx){ // function body
  		// console.log('transaction start');
  		tx.executeSql('DROP TABLE IF EXISTS places');
      tx.executeSql('CREATE TABLE IF NOT EXISTS places (id unique, address, name, photo, occupated)');
      $.each(data.places, function(index, elem){
				tx.executeSql('INSERT INTO places (id, address, name, photo, occupated) VALUES ("'+ elem._id + '", "' + elem.address + '", "'	+ elem.name + '", "'	+ elem.photo + '", "'	+ elem.occupated + '")');
				OSK_Helper.renderMainTemplate(elem);
			});
			// console.log('finished filling');
	  },
	  function(err) { // callback if error
			console.log(err);
		},
		function() { // callback if success
			// console.log("Success!");
			$('ul').listview('refresh');
      OSK_Helper.clickPlaceHandle();
		}
	  );
	},

  // Pobiera liste placow z API
	getPlacesFromAPI: function() {
		// JSONP for Cross Domain JSON transfer
		var placesJSON;
		$.getJSON(this.serverAddress + '/api/places?callback=?',	function(data){
			placesJSON = data;
			OSK_Helper.prepareDatabase_Places(placesJSON);
		});
	},

  // Renderuje liste placow na podstawie JSON z API
	renderMainTemplate: function(jsonData) {
		var template = $('#placesListElemTmpl').html();
		var html = Mustache.to_html(template, jsonData);
		$('#places-list').append(html);
	},

  // Renderuje szczegolowy widok placu po kliknieciu w element listy
  renderDetailsTemplate: function(data) {
    var template = $('#placesDetailsElemTmpl').html()
     ,  html = Mustache.to_html(template, data)
     ,  destinationElem = $('#placeDetailsContent');

    destinationElem.html(html);
    destinationElem.find('a').button();
  },

  // Obsluga logowania i wywolanie 
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

  // Wywolanie kolejnych funkcji po pomyslnym zalogowaniu
  onSuccessLogin: function() {
    window.loggedInAPI = true;
    $.mobile.changePage("#home");
    OSK_Helper.getPlacesFromAPI();
    OSK_Helper.openWebSocket();
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


  checkPreAuth: function() {
  	$("#submitButton",form).click(OSK_Helper.logInAPI);
    var form = $("#loginForm");
    if(window.localStorage["username"] != undefined && window.localStorage["password"] != undefined) {
    	console.log('checkPreAuth: logged in');
      $("#username", form).val(window.localStorage["username"]);
      $("#password", form).val(window.localStorage["password"]);
      $("#submitButton",form).click();
    } else {
    	console.log('checkPreAuth: logged out');
    }
	},


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
      console.log('disaplePlace: '+ data.place);
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
  //   return window.localStorage["username"];
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
       ,  thatContainer = that.closest('li');
       console.log(thatContainer);

      if ( thatContainer.hasClass('disabled') ) {

        alert('Ten plac jest zajęty!');

      } else {
        var data = {
          thatPlaceID: thatID,
          thatPlaceName: that.find('h3').text(),
          thatPlaceAddress: that.find('p').text()
        };

        OSK_Helper.occupyPlace(thatID);
        OSK_Helper.renderDetailsTemplate(data);
        OSK_Helper.clickReturnPlaces();
        $.mobile.changePage('#about', { transition: "slide" });

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

function init() {
	OSK_Helper.init();
};