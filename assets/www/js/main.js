window.loggedInAPI = false;

var OSK_Helper = {

	init: function() {
		OSK_Helper.checkPreAuth();
	},

	// serverAddress: 'http://oskhelper.eu01.aws.af.cm',
	serverAddress: 'http://localhost:3000',


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
			console.log("Success!");
			$('ul').listview('refresh');
		}
	  );
	},


	getPlacesFromAPI: function() {
		// JSONP for Cross Domain JSON transfer
		var placesJSON;
		$.getJSON(this.serverAddress + '/api/places?callback=?',	function(data){
			placesJSON = data;
			OSK_Helper.prepareDatabase_Places(placesJSON);
		});
	},


	renderMainTemplate: function(jsonData) {
		var template = $('#placesListElemTmpl').html();
		var html = Mustache.to_html(template, jsonData);
		$('#places-list').append(html);
	},


	postLogin: function(u,p) {
		$.ajax({
      url : OSK_Helper.serverAddress + "/api/login",
      type : "get",
      dataType : "jsonp",
      crossDomain: true,
      contentType : "application/json; charset=utf-8",
      data : {username:u,password:p},
      success : function(result, textStatus, jqXHR) {
        console.log(jqXHR.getAllResponseHeaders());
        window.localStorage["username"] = u;
        window.localStorage["password"] = p;
        window.loggedInAPI = true;
        $.mobile.changePage("#home");
        OSK_Helper.getPlacesFromAPI();
      },
      error : function(result) {
        alert("Coś się nie zgadza. Spróbuj ponownie.");
        alert(result);
      	$("#submitButton").removeAttr("disabled");
      	// navigator.notification.alert("Coś się nie zgadza. Spróbuj ponownie.", function() {});
      }
  	});
	},


	logInAPI: function() {
		var form = $("#loginForm");
    //disable the button so we can't resubmit while we wait
    $("#submitButton",form).attr("disabled","disabled");
    var u = $("#username", form).val();
    var p = $("#password", form).val();
    if(u != '' && p!= '') {
			OSK_Helper.postLogin(u,p);
    	// $.post(OSK_Helper.serverAddress + "/api/login?callback=?", {username:u,password:p}, function(res) {
    	// 	if(res == true) {
     //      //store
     //      window.localStorage["username"] = u;
     //      window.localStorage["password"] = p;
     //      window.loggedInAPI = true;
     //      $.mobile.changePage("#home");
     //      return true;
     //    } else {
     //    	alert("Coś się nie zgadza. Spróbuj ponownie.");
     //    	$("#submitButton").removeAttr("disabled");
     //    	// navigator.notification.alert("Coś się nie zgadza. Spróbuj ponownie.", function() {});
     //    }
     //    $("#submitButton").removeAttr("disabled");
     //  },"json");
    } else {
  		alert("Proszę wprowadzić poprawne dane logowania...");
      // navigator.notification.alert("Proszę wprowadzić poprawne dane logowania...", function() {});
      $("#submitButton").removeAttr("disabled");
    }
    return false;
  },


  checkPreAuth: function() {
  	$("#submitButton",form).click(OSK_Helper.logInAPI);
		console.log("checkPreAuth:");
    var form = $("#loginForm");
    if(window.localStorage["username"] != undefined && window.localStorage["password"] != undefined) {
    	console.log('logged in');
      $("#username", form).val(window.localStorage["username"]);
      $("#password", form).val(window.localStorage["password"]);
      $("#submitButton",form).click();
    } else {
    	console.log('logged out');
    }
	}

}

function init() {
	OSK_Helper.init();
};