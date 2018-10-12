/* Magic Mirror
 * Fetcher
 *
 * By Michael Teeuw http://michaelteeuw.nl
 * MIT Licensed.
 */

var FeedMe = require("feedme");
var request = require("request");
var iconv = require("iconv-lite");
var staticData = require("./data.json")

/* Fetcher
 * Responsible for requesting an update on the set interval and broadcasting the data.
 *
 * attribute url string - URL of the news feed.
 * attribute reloadInterval number - Reload interval in milliseconds.
 */

var Fetcher = function(url, reloadInterval, encoding) {
	var self = this;
	if (reloadInterval < 1000) {
		reloadInterval = 1000;
	}

	var reloadTimer = null;
	var items = [];

	var fetchFailedCallback = function() {};
	var itemsReceivedCallback = function() {};

	/* private methods */

	/* fetchNews()
	 * Request the new items.
	 */

	var fetchNews = function() {
		clearTimeout(reloadTimer);
		reloadTimer = null;
		items = [];

		// nodeVersion = Number(process.version.match(/^v(\d+\.\d+)/)[1]);
		// headers =  {"User-Agent": "Mozilla/5.0 (Node.js "+ nodeVersion + ") MagicMirror/"  + global.version +  " (https://github.com/MichMich/MagicMirror/)"}

		request(url,function(err, resp, body){
			if(err){
				if(err.code === "ECONNREFUSED"){
					processData(staticData)
				}
				else{
					fetchFailedCallback(self, err);
					scheduleTimer();
				}
			}
			else{
				// var data = JSON.parse(body).data;
				processData(JSON.parse(body).data)
			}
		});

	};

	var processData = function(data){
		data.forEach(function(centerItem){
			let city = centerItem.center_city
			let center = centerItem.center_name

			centerItem = centerItem['events_at_center'];
			centerItem.forEach(function(events_list){
				events_list = events_list['events_list'];
				events_list.forEach(function(item){
					var title = item.title || "";
					var description = item.short_description ? (item.short_description + " @"+center+", "+city ) : "";
					var url = item.small_image_url || "";
					if (title && description) {
						items.push({
							title: title,
							description: description,
							url: url,
						});
					}
				});
			});
		});
		self.broadcastItems();
		scheduleTimer();
	}

	/* scheduleTimer()
	 * Schedule the timer for the next update.
	 */

	var scheduleTimer = function() {
		//console.log('Schedule update timer.');
		clearTimeout(reloadTimer);
		reloadTimer = setTimeout(function() {
			fetchNews();
		}, reloadInterval);
	};

	/* public methods */

	/* setReloadInterval()
	 * Update the reload interval, but only if we need to increase the speed.
	 *
	 * attribute interval number - Interval for the update in milliseconds.
	 */
	this.setReloadInterval = function(interval) {
		if (interval > 1000 && interval < reloadInterval) {
			reloadInterval = interval;
		}
	};

	/* startFetch()
	 * Initiate fetchNews();
	 */
	this.startFetch = function() {
		fetchNews();
	};

	/* broadcastItems()
	 * Broadcast the existing items.
	 */
	this.broadcastItems = function() {
		if (items.length <= 0) {
			//console.log('No items to broadcast yet.');
			return;
		}
		//console.log('Broadcasting ' + items.length + ' items.');
		itemsReceivedCallback(self);
	};

	this.onReceive = function(callback) {
		itemsReceivedCallback = callback;
	};

	this.onError = function(callback) {
		fetchFailedCallback = callback;
	};

	this.url = function() {
		return url;
	};

	this.items = function() {
		return items;
	};
};

module.exports = Fetcher;
