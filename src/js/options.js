var port = chrome.runtime.connect({ name: "options" }),
    model = new Model();

var EClear,
    EConnections,
    ECopyOnRehost,
    ETabOnRehost,
    ECopyOnCapture,
    ETabOnCapture,
	EEnableNotifications,
    EUseCustomApi,
    ECustomApiId,
    ECustomApiSecret,
    ESubmit;


port.onMessage.addListener(function (msg) {
    window.location.reload();
});

window.onload = function () {

    EMain = UTILS.D.id('nav-main'),
    EClear = UTILS.D.id('btn-clear'),
    EConnections = UTILS.D.id('connections'),
    ECopyOnRehost = UTILS.D.id('copy-on-rehost'),
    ETabOnRehost = UTILS.D.id('tab-on-rehost'),
    ECopyOnCapture = UTILS.D.id('copy-on-capture'),
    ETabOnCapture = UTILS.D.id('tab-on-capture'),
	EEnableNotifications = UTILS.D.id('enable-notifications'),
    EUseCustomApi = UTILS.D.id('use-custom-api');
    ECustomApiId = UTILS.D.id('custom-api-id');
    ECustomApiSecret = UTILS.D.id('custom-api-secret');
    ESubmit = UTILS.D.id('submit');

    if (!model.authenticated.oAuthManager.getAuthStatus()) {
        EClear.style.display = "none";
    } else {
        EClear.onclick = function () {
            if (confirm("Are you sure?")) {
                model.reset();
                port.postMessage({ CMD: "sync" });
            }
        };
    }

    ESubmit.disabled = "disabled";

    EConnections.onclick = ECopyOnRehost.onclick = ETabOnRehost.onclick = ECopyOnCapture.onclick = ETabOnCapture.onclick = EEnableNotifications.onclick = EUseCustomApi.onclick = ECustomApiId.onclick = ECustomApiSecret.onclick = function () {
        ESubmit.removeAttribute("disabled");
    };

    EConnections.value = model.preferences.get('connections');
    ECopyOnRehost.checked = model.preferences.get('copyonrehost');
    ETabOnRehost.checked = model.preferences.get('tabonrehost');
    ECopyOnCapture.checked = model.preferences.get('copyoncapture');
    ETabOnCapture.checked = model.preferences.get('taboncapture');
    EEnableNotifications.checked = model.preferences.get('enablenotifications');
    EUseCustomApi.checked = model.preferences.get('usecustomapi');
    ECustomApiId.value = model.preferences.get('customapiid');
    ECustomApiSecret.value = model.preferences.get('customapisecret');

    ESubmit.onclick = function () {

        ESubmit.value = "saving...";
        ESubmit.style.cursor = "progress";

        if (model.preferences.get('usecustomapi') != EUseCustomApi.checked) {
            if (confirm("Changing to or from a custom api key will clear your authentication, are you sure?")) {
                model.reset();
                port.postMessage({ CMD: "sync" });
            } else {
                ESubmit.value = "save changes";
                ESubmit.style.cursor = "default";
                EUseCustomApi.checked = model.preferences.get('usecustomapi');
                return;
            }
        }
        model.preferences.set('connections', EConnections.value);
        model.preferences.set('copyonrehost', ECopyOnRehost.checked);
        model.preferences.set('tabonrehost', ETabOnRehost.checked);
        model.preferences.set('copyoncapture', ECopyOnCapture.checked);
        model.preferences.set('taboncapture', ETabOnCapture.checked);
        model.preferences.set('enablenotifications', EEnableNotifications.checked);
        model.preferences.set('usecustomapi', EUseCustomApi.checked);
        model.preferences.set('customapiid', ECustomApiId.value);
        model.preferences.set('customapisecret', ECustomApiSecret.value);
        setTimeout(function () {
            port.postMessage({ CMD: "sync" });
        }, 1000);
    }


};
