var OSK_Helper = {

	init: function() {
		this.getPlacesFromAPI();
	},

	// serverAddress: 'http://oskhelper.eu01.aws.af.cm',
	serverAddress: 'http://localhost:3000',


	prepareDatabase_Places: function(data) {
		var self = this;
		// console.log('prepareDatabase_Places start');
		// var db_places = window.openDatabase("places", "1.0", "Place manewrowe", 5*1024*1024);
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
	}

}

function init() {
	document.addEventListener("deviceready", onDeviceReady, false);
	OSK_Helper.getPlacesFromAPI();
}

function onDeviceReady() {

	$(document).ready(function(){
		OSK_Helper.init();
	});

}