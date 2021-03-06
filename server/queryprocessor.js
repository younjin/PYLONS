var _ = require('underscore');
var pos = require('pos');
var natural = require('natural');
var opengraph = require('./opengraph');

var qp = exports;

// Retrieved form http://stackoverflow.com/questions/196972/convert-string-to-title-case-with-javascript
function toTitleCase(str)
{
	return str.replace(/\w\S*/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();});
}

qp.queries = {
	gender: 'SELECT+name,sex+FROM+user+WHERE+uid+IN+(SELECT+uid2+FROM+friend+WHERE+uid1+=+me());',
	relationship: 'SELECT+name,relationship_status+FROM+user+WHERE+uid+IN+(SELECT+uid2+FROM+friend+WHERE+uid1+=+me());',
	mutual: 'SELECT+name,mutual_friend_count+FROM+user+WHERE+uid+IN+(SELECT+uid2+FROM+friend+WHERE+uid1+=+me());',
	friends: 'SELECT+name,friend_count+FROM+user+WHERE+uid+IN+(SELECT+uid2+FROM+friend+WHERE+uid1+=+me());',
	current_loc: 'SELECT+name,current_location.city+FROM+user+WHERE+uid+IN+(SELECT+uid2+FROM+friend+WHERE+uid1+=+me());',
	languages: 'SELECT+name,languages.name+FROM+user+WHERE+uid+IN+(SELECT+uid2+FROM+friend+WHERE+uid1+=+me());'
}

qp.query = function(query, category, token, callback) {
	var words = new pos.Lexer().lex(query);
	var taggedWords = new pos.Tagger().tag(words);
	
	/*
	for (i in taggedWords) {
		var taggedWord = taggedWords[i];
		var word = taggedWord[0];
		var tag = taggedWord[1];
		console.log(word + " /" + tag);
	}
	*/
	
	console.log('Query: ' + category);
	
	switch (category) {
		case 'current_loc':
			var mistakenWords = [
				'show',
				'friend'
			];
			
			var locations = _.map(_.filter(taggedWords, function(taggedWord) {
			if (taggedWord[1] == 'NN' && !_.contains(mistakenWords, taggedWord[0])) {
				return true;
			}
				return false;
			}), function(taggedWord) {
				return taggedWord[0];
			});
			
			console.log(locations);
			if (locations.length == 0) {
				callback(null, true);
			}
			else {
                cityQuery = locations.join('+');
				var graphQuery = 'SELECT+name,uid+FROM+user+WHERE+uid+IN+(SELECT+uid2+FROM+friend+WHERE+uid1+=+me())+AND+current_location.city+==+"' + cityQuery + '";';
				opengraph.fql(graphQuery, token, function(data) {
					callback(data, false);
				});
			}
			break;
		case 'single':
			var graphQuery='SELECT+name,uid+FROM+user+WHERE+uid+IN+(SELECT+uid2+FROM+friend+WHERE+uid1+=+me())+AND+relationship_status+IN+("Single")';
			
			if (_.intersection(query.split(' '), ['women', 'ladies']).length != 0) {
				graphQuery += '+AND+sex+IN+("female")';
			}
			else if (_.intersection(query.split(' '), ['men', 'guys']).length != 0) {
				graphQuery += '+AND+sex+IN+("male")';
			}
			opengraph.fql(graphQuery, token, function(data) {
				console.log(data);
				callback(data, false);
			});
			break;
		case 'relationship':
		case 'gender':
		case 'mutual':
		case 'friends':
		case 'languages':
			opengraph.fql(qp.queries[category], token, function(data) {
				callback(data, false);
			});
			break;
		default:
			callback(null, true);
			break;
	}
};

