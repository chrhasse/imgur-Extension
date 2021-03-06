var port = chrome.runtime.connect({ name: "main" }),
    model = new Model(),
    EWrap,
    ENav,
    ENavConnect,
    ENavSelect,
	ENavOptions,
	ENavDelete,
    EAlbums,
    CurrentAlbum,
    ECurrentAlbum,
    EStatusBar,
    EStatusBarLink,
    NoImagesMessage = "You have no images in this album. You can drag and drop images onto this page or print screen and paste straight onto this page to upload your images."
    
function uploadFiles(e) {
    
    var noImages = ECurrentAlbum.querySelectorAll('.no-images')[0];
    if (noImages) {
        ECurrentAlbum.removeChild(noImages);
    }

    var filesObj = e.dataTransfer.files,
        files = [];

    for (var v = 0; v < filesObj.length; v++) {
        if (filesObj[v].type.match(/image.*/)) {
            files.push(filesObj[v]);
        }
    }
    if (files.length > 0) {
        for (var i = 0; i < files.length; i++) {
            var file = files[i],
                reader = new FileReader();
            reader.onload = function (e) {
                makeItem(e.target.result);
            };
            reader.readAsDataURL(file);
        }
    } else {
        
    }
}

function makeImage(fileData) {

    var img = UTILS.D.create('image');
    img.src = fileData;
    
    img.style.display = 'none';

    img.onload = function () {

        img.style.display = 'block';

        if (img.width >= img.height) {
            img.width = 160;
        } else if(img.height >= img.width) {
            img.height = 160;
        }
       
    };

    return img;

}

function friendlyNumber(n,d){
    x=(''+n).length,p=Math.pow,d=p(10,d);x-=x%3;return Math.round(n*d/p(10,x))/d+" kMGTPE"[x/3]
}

function albumEquals(a1, a2) {

    if(a1.length !== a2.length) {
        return false;
    }
    
    var is = false;

    a1.forEach(function(a,i) {
        if(a["id"] === a2[i]["id"]) {
            is = true;
        } else {
            is = false;
            return;
        }
    });

    return is;

}

function makeItem(fileData) {
	
    var ul = ECurrentAlbum.querySelectorAll('ul')[0],
        img = makeImage(fileData);
    var loadingItem = makeLoadingItem(img);
    var progress = loadingItem.querySelectorAll('progress')[0];
    ul.insertBefore(loadingItem, ul.firstChild);
    var evt;
    if (CurrentAlbum == "_thisComputer") {
        evt = model.unsorted.sendImage(encodeURIComponent(fileData.split(',')[1]));
        evt.addEventListener('EVENT_SUCCESS', function (e) {
        	convertLoadingToAlbum(loadingItem, e);
        });
    } else {
        evt = model.authenticated.sendImage(CurrentAlbum, fileData.split(',')[1]);
        evt.addEventListener('EVENT_SUCCESS', function (e) {

            if (CurrentAlbum == "_userFavouritesAlbum") {

                favouriteEvt = model.authenticated.favouriteImage(e.id).addEventListener('EVENT_SUCCESS', function () {

                    convertLoadingToAlbum(loadingItem, e);

                }).addEventListener('EVENT_ERROR', function() {
                  
                	chrome.notifications.create("", {

                		type: "basic",
                		iconUrl: e.link,
                		title: "Error",
                		message: "We were able to upload your image but not favourite it."
                	}, function () { });

                });

                
            } else {

                convertLoadingToAlbum(loadingItem, e);

            }

        });
    }
                
    evt.addEventListener(evt.EVENT_PROGRESS, function (e) {
        progress.value = Math.floor(((e.loaded/e.total) * 100));
    });

    evt.addEventListener('EVENT_PROGRESS', setBodyLoading);

    evt.addEventListener('EVENT_COMPLETE', setBodyFinished);
                
    evt.addEventListener('EVENT_ERROR', function (msg) {

        var progress = loadingItem.querySelectorAll('progress')[0];
        loadingItem.removeChild(progress);
        loadingItem.classList.add('error');
        var errorText = msg;

        if (msg.status === 400) {
        	errorText += ' Please reload this page.';
        }

        loadingItem.onclick = function () { alert(errorText); };

    });
}

function makeURLItem(URL) {
    var ul = ECurrentAlbum.querySelectorAll('ul')[0],
        img = makeImage(URL);
    var loadingItem = makeLoadingItem(img);
    var progress = loadingItem.querySelectorAll('progress')[0];
    ul.insertBefore(loadingItem, ul.firstChild);
    var evt;
    if (CurrentAlbum == "_thisComputer") {
        evt = model.unsorted.sendImageURL(URL);
        evt.addEventListener('EVENT_SUCCESS', function (e) {
            convertLoadingToAlbum(loadingItem, e);
        });
    } else {
        evt = model.authenticated.sendImageURL(CurrentAlbum, URL);
        evt.addEventListener('EVENT_SUCCESS', function (e) {
            convertLoadingToAlbum(loadingItem, e);
        });
    }

    evt.addEventListener(evt.EVENT_PROGRESS, function (e) {
        progress.value = Math.floor(((e.loaded / e.total) * 100));
    });


    evt.addEventListener('EVENT_ERROR', function (msg) {
        var progress = loadingItem.querySelectorAll('progress')[0];
        loadingItem.removeChild(progress);
        loadingItem.classList.add('error');
        var errorText = msg.text;

        if (msg.status === 400) {
        	errorText += ' Please reload this page.';
        }

        loadingItem.onclick = function () { alert(errorText); };

    });
}

function deleteImage(imageId) {

    var elem = document.getElementById(imageId);

    progress = UTILS.D.create('progress');

    elem.appendChild(progress);

    var inner = elem.getElementsByClassName('inner')[0],
        links = inner.getElementsByClassName('action');

    for (var i = 0; i < links.length - 1; i++) {
        inner.removeChild(links[i]);
    }

    elem.classList.add('loading');
    if (CurrentAlbum == "_thisComputer") {
    	model.unsorted.deleteImage(elem.getAttribute('data-deletehash')).addEventListener('EVENT_SUCCESS', function (e) {
            if (elem) {
                elem.parentNode.removeChild(elem);
            }
        });
    } else {
        elem.style.cursor = 'progress';
        model.authenticated.deleteImage(imageId).addEventListener('EVENT_SUCCESS', function (e) {
            if (elem) {
                elem.style.cursor = 'default';
                elem.parentNode.removeChild(elem);
            }
        });
    }
}

function makeAlbumItem(imageItem) {

    var li = UTILS.D.create('li'),
        inner = UTILS.D.create('div'),
        img = UTILS.D.create('img'),
        imgLink = UTILS.D.create('a');
       
    li.id = imageItem.id;
    li.classList.add('loading');

    inner.classList.add('inner');
    li.appendChild(inner);

    if (imageItem.views) {
        var views = UTILS.D.create('span');
        views.classList.add('image-views');
        views.innerHTML = friendlyNumber(imageItem.views, 1) + " view" + (imageItem.views !== 1 ? "s" : "");
        inner.appendChild(views);
    }

    img.onload = function () {
        li.classList.remove('loading');
    };

    imgLink.href = imageItem.link;

    if (imageItem.title) {
		imgLink.title = imageItem.title;
	}
    imgLink.classList.add('image-link');
    imgLink.dataset.action = "image-link";
    imgLink.appendChild(img);
    inner.appendChild(imgLink);

    if (!imageItem.is_album) {

    	var del = UTILS.D.create('a'),
            copy = UTILS.D.create('a'),
		    download = UTILS.D.create('a'),
		    meme = UTILS.D.create('a'),
            copyInput = UTILS.D.create('input'),
			unfav = UTILS.D.create('a');

        del.href = copy.href = "#";
        del.innerHTML = "delete";
        del.classList.add('image-delete');
        del.dataset.imageid = imageItem.id;
        del.dataset.action = "image-delete";
        del.classList.add('action');

        // Not implemented because the API doesn't handle it
        /*
        unfav.href = copy.href = "#";
        unfav.innerHTML = "unfavourite";
        unfav.classList.add('image-delete');
        unfav.classList.add('action');
        unfav.onclick = function (e) {
        	e.preventDefault();
        	if (unfav.innerHTML == 'sure?') {
        		unfavourite(imageItem);
        	} else {
        		unfav.innerHTML = 'sure?';
        	}

        };
        */

        copy.innerHTML = "copy link";
        copy.classList.add('image-copy');
        copy.classList.add('action');
        copy.dataset.action = "image-copy";
        copy.copyInput = copyInput;
        copy.li = li;

        copyInput.type = 'text';
        copyInput.value = imageItem.link;

        meme.href = "https://imgur.com/memegen/create/" + imageItem.id;
        meme.innerHTML = "meme";
        meme.classList.add('image-meme');
        meme.classList.add('action');
        meme.dataset.action = "image-meme";

        img.id = 'image-' + imageItem.id;

        var il = imageItem.link.split('.'),
            ext = il.pop(),
			imageName = il.join('.');

        var imageLinkHasH = imageName[imageName.length - 1] === 'h';

    	// imgur thumbnail linking is all sorts of crazy
    	// A gif may or may not have an "h" for "huge" added to its link
    	// All gifs have a "gifv" property set even if they are not gifv

    	// If they are a real gif (link doesn't have an h) leave it alone 
    	// If they are a real gifv (link contains an h but gifv doesn't contain an h), remove the link h
		// If they are a fake gifv (link contains an h and gifv contains an h) leave it alone

    	// REAL GIF: http://i.imgur.com/8lAgRv1.gif
    	// THUMB = Link (http://i.imgur.com/8lAgRv1.gif) + "t" = http://i.imgur.com/8lAgRv1t.gif
    	// REAL GIFV: http://i.imgur.com/KJ0U7nj.gifv
    	// THUMB = Link (http://i.imgur.com/KJ0U7njh.gif) - "h" + t = http://i.imgur.com/KJ0U7njt.gif
    	// FAKE GIFV: http://i.imgur.com/9M2WG4h.gifv
    	// THUMB = Link (http://i.imgur.com/9M2WG4h.gif) + "t" = http://i.imgur.com/9M2WG4ht.gif

        if (imageItem.gifv && imageLinkHasH) {

        	var gifVFixArr = imageItem.gifv.split('.'); gifVFixArr.pop();
        	var gifVFix = gifVFixArr.join('.');
        	var realGifV = gifVFix[gifVFix.length - 1] !== 'h';
        	
			// Real gifV doesn't have an h
        	if (realGifV) {

        		imageName = imageName.substring(0, imageName.length - 1);
        		imgLink.href = imageItem.gifv;

        	}
        	
        }

        img.src = imageName + 't.' + ext;

        if (imageItem.deletehash) {
            li.setAttribute('data-deletehash', imageItem.deletehash);
        }

        download.href = imageItem.link;
		download.setAttribute("download", imageItem.id);
        download.innerHTML = "download";
        download.classList.add('image-download');
        download.classList.add('action');

        inner.appendChild(copyInput);
        if (CurrentAlbum !== "_userFavouritesAlbum") {
        	inner.appendChild(del);
        }
        /* Not implemented because the API doesn't handle it
        else {
        	inner.appendChild(unfav);
        }
		*/
        inner.appendChild(copy);
        inner.appendChild(meme);
        inner.appendChild(download);

    } else {

        var title = UTILS.D.create('div');
        title.innerHTML = imageItem.title;
        title.classList.add('album-title');
        inner.appendChild(title);

        img.src = 'https://i.imgur.com/' + imageItem.cover + 't.jpg';
        
    }

    return li;

}

function makeLoadingItem(image) {
    var li = UTILS.D.create('li'),
        inner = UTILS.D.create('div'),
        progress = UTILS.D.create('progress');

    progress.setAttribute('min', '0');
    progress.setAttribute('max', '100');

    inner.classList.add('inner');

    inner.appendChild(image);
    li.appendChild(inner);
    li.appendChild(progress);
    li.classList.add('loading');

    return li;
}

function convertLoadingToAlbum(loadingItem, fullItem) {
    loadingItem.parentNode.replaceChild(makeAlbumItem(fullItem), loadingItem);
}

function makeAlbum(album) {
    var div = UTILS.D.create('div'),
        ul = UTILS.D.create('ul');

    div.id = album.id;
    div.className = 'album';

    div.appendChild(ul);

    return div;

}

function criticalError(msg) {
    chrome.notifications.create("", {
        type: "basic",
        iconUrl: "img/logo96.png",
        title: "Error",
        message: msg.text || "Something went wrong. Try refreshing."
    }, function () { });
}

function setBodyLoading() {
    document.body.classList.add('loading');
    ENavSelect.setAttribute('disabled', 'disabled');
}

function setBodyFinished() {
    document.body.classList.remove('loading');
    ENavSelect.removeAttribute('disabled');
}

function isBodyLoading() {
	return document.body.classList.contains('loading');
}

function showStatusBar(text) {
	EStatusBar.querySelectorAll('.content')[0].innerHTML = text;
	EStatusBar.classList.add('show');
}

function hideStatusBar() {
	EStatusBar.classList.remove('show');
}

function clearAlbumImages(album) {
    var ul = album.querySelectorAll('ul')[0];
    ul.innerHTML = "";
}

function constructAlbumImages(images, album) {
    
	var ul = album.querySelectorAll('ul')[0];
    
    if (images.length > 0) {
        // TODO: Optimise
    	for (var i = 0; i < images.length; i++) {
            
    		if (album.id === '_userAlbum' || album.id === '_userFavouritesAlbum') {

            	ul.appendChild(makeAlbumItem(images[i]));

            } else {
                ul.insertBefore(makeAlbumItem(images[i]), ul.firstChild);
            }
            
        }
    }
}

function changeAlbum(albumID) {

    if (albumID == "_newAlbum") {

        var albumTitle = prompt('Album title');

        if (albumTitle == "" || !albumTitle) {
            ENavSelect.value = CurrentAlbum;
        } else {
            model.authenticated.makeAlbum(albumTitle).addEventListener('EVENT_COMPLETE', function (album) {
                model.currentAlbum.set(album.id);
                window.location.reload();
            });
        }

        return;
    }
    
    model.currentAlbum.set(albumID);

    ENavSelect.value = albumID;

    if (ECurrentAlbum) {
        ECurrentAlbum.classList.remove('active');
    }

    CurrentAlbum = albumID;
    ECurrentAlbum = UTILS.D.id(CurrentAlbum);
    ECurrentAlbum.classList.add('active');
    ECurrentAlbum.dataset.end = false;
    ECurrentAlbum.querySelectorAll('ul')[0].innerHTML = "";

    var currentOffset = 0;
    window.onscroll = null;

    if(CurrentAlbum !== "_thisComputer") {
        
        fetchImages(CurrentAlbum, ECurrentAlbum, 0).addEventListener('EVENT_SUCCESS', function(images) {
            if(images.length == 0) {
                showStatusBar(NoImagesMessage);
            } else {
                hideStatusBar();
            }
            window.onscroll = function() {
                var scrollTop = (document.documentElement.scrollTop || document.body.parentNode.scrollTop || document.body.scrollTop);
                if(scrollTop + window.innerHeight >= (document.body.clientHeight - 100)) {
                    if (ECurrentAlbum.dataset.end === "false" && !isBodyLoading()) {
                        fetchImages(CurrentAlbum, ECurrentAlbum, ++currentOffset);
                    }
                }
            }
        });
    } else {
        var images = fetchImages(CurrentAlbum, ECurrentAlbum);
        if(images.length == 0) {
            showStatusBar(NoImagesMessage);
        } else {
            hideStatusBar();
        }
    }

}

function fetchImages(albumID, EAlbum, currentOffset) {

    if(albumID == "_thisComputer") {
        var images = model.unsorted.get();
        constructAlbumImages(images, EAlbum);
        return images;
    }

    var callback;
    //var immediateImages;

    setBodyLoading();

    switch(albumID) {

        case "_userAlbum":

        //immediateImages = model.authenticated.getUserImages(currentOffset) || [];
        callback = model.authenticated.fetchUserImages(currentOffset);

        break;

        case "_userFavouritesAlbum":

        //immediateImages = model.authenticated.getFavourites(currentOffset) || [];
        callback = model.authenticated.fetchFavourites(currentOffset);

        break;

        default:
        
        //immediateImages = model.authenticated.getAlbumImages(albumID, currentOffset) || []
        callback = model.authenticated.fetchAlbumImages(albumID, currentOffset);

        break;

    }

    /*
    This is buggy when dealing with uploading files e.g. drag and drop
    callback.addEventListener('EVENT_SUCCESS', function (images) {

        constructAlbumImages(immediateImages, EAlbum);
        
        if (images.length > 0) {
            if(!albumEquals(images, immediateImages)) {
                constructAlbumImages(images, EAlbum);
            }
        } else {
            EAlbum.dataset.end = true;
        }
    })
    */

    callback.addEventListener('EVENT_SUCCESS', function (images) {
        // This is buggy when dealing with uploading files e.g. drag and drop
        if (images.length > 0) {
            constructAlbumImages(images, EAlbum);
        } else {
            EAlbum.dataset.end = true;
            window.onscroll = null;
        }
    }).addEventListener('EVENT_ERROR', function (msg) {
        if (msg.status === 400) {
            criticalError(msg);
        }
    }).addEventListener('EVENT_COMPLETE', setBodyFinished);

	return callback;

}




function initAuthenticated() {

    ENavConnect.classList.add('hide');
    
    model.authenticated.fetchAlbums().addEventListener('EVENT_SUCCESS', function(albums) {
        
        ENavSelect.classList.remove('hide');

        var unsortedOpt = UTILS.D.create('option');
        unsortedOpt.value = '_thisComputer';
        unsortedOpt.text = 'This Computer';
        ENavSelect.appendChild(unsortedOpt);
    
        var defaultAlbumOpt = UTILS.D.create('option');
        defaultAlbumOpt.value = '_userAlbum';
        defaultAlbumOpt.text = model.authenticated.getAccount().url;
        ENavSelect.appendChild(defaultAlbumOpt);
    
        var EUserAlbum = makeAlbum({ id: '_userAlbum' });
        EAlbums.appendChild(EUserAlbum);
    
        var favouritesOpt = UTILS.D.create('option');
        favouritesOpt.value = '_userFavouritesAlbum';
        favouritesOpt.text = 'My Favourites';
        ENavSelect.appendChild(favouritesOpt);
    
        var EUserFavouritesAlbum = makeAlbum({ id: '_userFavouritesAlbum' });
        EAlbums.appendChild(EUserFavouritesAlbum);
    
        if (albums) {
    
            var albumsOptGroup = UTILS.D.create('optgroup');
            albumsOptGroup.setAttribute('label', 'Albums');
    
            for (var i = 0; i < albums.length; i++) {
    
                var EAlbum = makeAlbum(albums[i]);
    
                var opt = UTILS.D.create('option');
                opt.value = albums[i].id;
                opt.text = albums[i].title || "(API processing)";
    
                albumsOptGroup.appendChild(opt);
                EAlbums.appendChild(EAlbum);
            }
    
            ENavSelect.appendChild(albumsOptGroup);
        }
        
        var newAlbumOpt = UTILS.D.create('option');
        newAlbumOpt.value = '_newAlbum';
        newAlbumOpt.text = '<New Album>';
        albumsOptGroup.appendChild(newAlbumOpt);

        changeAlbum(model.currentAlbum.get());

    });
}

port.onMessage.addListener(function (msg) {
    // Only gets one message
    window.location.reload();
});

window.onload = function() {

    EAlbums = UTILS.D.id('albums');
	EWrap = UTILS.D.id('wrap');
	ENav = document.getElementsByTagName('nav')[0];
	ENavConnect = UTILS.D.id('nav-connect');
	ENavOptions = UTILS.D.id('nav-options');
	ENavDelete = UTILS.D.id('nav-delete');
	ENavSelect = UTILS.D.id('nav-albums');
	EStatusBar = UTILS.D.id('status-bar');
	EStatusBarLink = EStatusBar.querySelectorAll('span')[0];

	document.documentElement.ondrop = function (e) {
        e.preventDefault();
		uploadFiles(e);
		hideStatusBar();
	};

	document.documentElement.ondragenter = function (e) {
		e.dataTransfer.dropEffect = 'copy';
		e.preventDefault();
		return false;
	};

	document.documentElement.ondragover = function (e) {
		e.preventDefault();
		e.dataTransfer.dropEffect = 'copy';
		showStatusBar("Drop images to upload");
		return false;
	};

	document.documentElement.ondragexit = document.documentElement.ondragleave = function (e) {
		hideStatusBar();
		return false;
    };
    
	document.documentElement.onpaste = function (e) {
		var items = e.clipboardData.items;
		for (var i = 0; i < items.length; ++i) {
			if (items[i].kind == 'file' && items[i].type == 'image/png') {
				var blob = items[i].getAsFile();

				var reader = new FileReader();
				reader.onload = function (e) {
					makeItem(e.target.result);
				}
				reader.readAsDataURL(blob);

			}
		}
	};

	ENavConnect.onclick = function () {
		ENavConnect.onclick = null;
		ENavConnect.innerHTML = '<progress />';
		ENavConnect.style.cursor = 'progress';
		port.postMessage({ CMD: "get_user" });
	};

	ENavOptions.onclick = function(e) {

		e.preventDefault();
		var dialog = UTILS.D.create('dialog');
        if (!dialog.showModal) {
            dialogPolyfill.registerDialog(dialog);
        }
		var iframe = UTILS.D.create('iframe');
		var close = UTILS.D.create('button');
		
		close.classList.add("options-close");
		close.onclick = function() {
			dialog.close();
		}

		iframe.src = this.href;

		dialog.classList.add("options-dialog");
		dialog.appendChild(iframe);
		dialog.appendChild(close);
		dialog.onclose = function() {
			body.removeChild(dialog);
		}
		
		body.appendChild(dialog);
        dialog.showModal();
        
	};

	ENavSelect.onchange = function () {
		changeAlbum(this.value);
	};

	ENavDelete.onclick = function (e) {
		e.preventDefault();

		if(confirm("Are you sure you want to delete all images in this album?")) {

			var images = ECurrentAlbum.querySelectorAll('li');

			for (var i = 0; i < images.length; i++) {
				deleteImage(images[i].id)
			}

		}

	}

	EStatusBarLink.addEventListener('click', function (e) {
		hideStatusBar();
	});

	EAlbums.appendChild(makeAlbum({ id: '_thisComputer' }));

	if (model.authenticated.oAuthManager.getAuthStatus()) {
		initAuthenticated();
	} else {
        ENavConnect.classList.remove('hide');
        changeAlbum("_thisComputer");
    }

    EAlbums.addEventListener("click", function(e) {
       
        var el = e.target;
        var actions = ["image-link", "image-delete", "image-copy", "image-meme"]
        var action;
        
        while(el !== this && !action) {
            action = actions.find(function(a) {
                return el.dataset && (el.dataset.action == a);
            });
            if(!action) {
                el = el.parentNode;
            }
        }

        if(action) {
            e.preventDefault();
            switch(action) {
    
                case "image-link":
                    chrome.tabs.create({ "url": el.href, "active": true });
                break;

                case "image-meme":
                    chrome.tabs.create({ "url": el.href, "active": true });
                break;
    
                case "image-delete":
                
                    if (el.innerHTML == 'sure?') {
                        deleteImage(el.dataset.imageid);
                    } else {
                        el.innerHTML = 'sure?';
                    }
    
                break;
    
                case "image-copy":
    
                    el.copyInput.select();
                    document.execCommand("Copy");
                    var copyNotification = UTILS.D.create('span');
    
                    copyNotification.innerHTML = 'copied';
                    copyNotification.classList.add('copy-notification');
                    el.li.appendChild(copyNotification);
                    setTimeout(function () {
                        el.li.removeChild(copyNotification);
                    }, 1000);
    
                break;
            }
        }

        

    })

	var body = document.body,
		timer;

	window.addEventListener('scroll', function () {
		clearTimeout(timer);
		if (!body.classList.contains('disable-hover')) {
			body.classList.add('disable-hover')
		}

		timer = setTimeout(function () {
			body.classList.remove('disable-hover')
		}, 500);
	}, false);

};
