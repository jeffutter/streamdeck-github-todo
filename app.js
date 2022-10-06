/* global $CC, Utils, $SD */

/**
 * Here are a couple of wrappers we created to help you quickly setup
 * your plugin and subscribe to events sent by Stream Deck to your plugin.
 */

/**
 * The 'connected' event is sent to your plugin, after the plugin's instance
 * is registered with Stream Deck software. It carries the current websocket
 * and other information about the current environmet in a JSON object
 * You can use it to subscribe to events you want to use in your plugin.
 */

$SD.on('connected', (jsonObj) => connected(jsonObj));

function connected(jsn) {
    // Subscribe to the willAppear and other events
    $SD.on('com.jeffutter.githubtodo.action.willAppear', (jsonObj) => action.onWillAppear(jsonObj));
    $SD.on('com.jeffutter.githubtodo.action.keyUp', (jsonObj) => action.onKeyUp(jsonObj));
    $SD.on('com.jeffutter.githubtodo.action.didReceiveSettings', (jsonObj) => action.onDidReceiveSettings(jsonObj));
    $SD.on('com.jeffutter.githubtodo.action.propertyInspectorDidAppear', (jsonObj) => {
        console.log('%c%s', 'color: white; background: black; font-size: 13px;', '[app.js]propertyInspectorDidAppear:');
    });
    $SD.on('com.jeffutter.githubtodo.action.propertyInspectorDidDisappear', (jsonObj) => {
        console.log('%c%s', 'color: white; background: red; font-size: 13px;', '[app.js]propertyInspectorDidDisappear:');
    });
};

// ACTIONS

const action = {
    settings: { githubToken: null, searchQuery: null },
    interval: null,

    onDidReceiveSettings: function (jsn) {
        console.log('%c%s', 'color: white; background: red; font-size: 15px;', '[app.js]onDidReceiveSettings:');

        const newSettings = Object.assign({ githubToken: null, searchQuery: null }, Utils.getProp(jsn, 'payload.settings', {}))
        const oldToken = this.settings.githubToken
        const newToken = newSettings.githubToken
        const oldSearchQuery = this.settings.searchQuery
        const newSearchQuery = newSettings.searchQuery
        this.settings = newSettings

        if (oldToken != newToken || oldSearchQuery != newSearchQuery) {
            this.resetInterval(jsn)
        }
    },

    onWillAppear: function (jsn) {
        console.log("You can cache your settings in 'onWillAppear'", jsn.payload.settings);

        this.settings = Object.assign({ githubToken: null, searchQuery: null }, jsn.payload.settings);

        this.resetInterval(jsn)
    },

    resetInterval: function (jsn) {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }

        this.fetchIssueCount().then((v) => {
            this.setImage(jsn, v);
        }).catch((_error) => {
            this.setImage(jsn, "Error")
        });

        this.interval = setInterval(() => {
            this.fetchIssueCount().then((v) => {
                this.setImage(jsn, v);
            }).catch((_error) => {
                this.setImage(jsn, "Error")
            });
        }, 1000 * 60 * 5);
    },

    onKeyUp: function (jsn) {
        if (!this.settings.searchQuery || this.settings.searchQuery == "") {
            return
        }

        $SD.api.openUrl(jsn.context, this.issueURL(this.settings.searchQuery))
    },

    fetchIssueCount: function () {
        if (!this.settings.githubToken || this.settings.githubToken == "") {
            return Promise.reject("Missing Github Token")
        }
        if (!this.settings.searchQuery || this.settings.searchQuery == "") {
            return Promise.reject("Missing Github SearchQuery")
        }

        return fetch("https://api.github.com/graphql", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": "bearer " + this.settings.githubToken
            },
            "body": JSON.stringify({ query: this.query(this.settings.searchQuery), variables: {} })
        }).then((res) => res.json()).then((json) => json.data.search.issueCount)
    },

    query: function (search_query) {
        return `{
            search(query: "${search_query}", type: ISSUE, first: 100) {
                issueCount
            }
        }`
    },


    issueURL: function (search_query) {
        return `https://github.com/search?q=${encodeURIComponent(search_query)}`
    },

    setImage: function (jsn, v) {
        $SD.api.setImage(jsn.context, "data:image/svg+xml;charset=utf8,<svg height=\"100%\" width=\"100%\"><text x=\"50%\" y=\"50%\" dominant-baseline=\"middle\" text-anchor=\"middle\" fill=\"white\" font-size=\"24px\">Issues: " + v.toString() + "<\/text><\/svg>");
    },

};

