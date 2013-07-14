(function() {

	if (typeof dtree == "undefined") {
		dtree = {};
	}

	var client = null;
	var copy = null;
	var needle = null;

	function getJson(name, path, type) {
		var childPath = path + "/" + name;
		var dd = {
			data : {
				title : name,
				icon : type
			},
			attr : {
				id : "node_" + childPath
			},
			metadata : {
				type : type,
				path : childPath
			}

		};
		if (type == "folder") {
			dd["state"] = "closed";
		}

		return dd;
	}

	function initialLoad(node, callback) {
		var path = "";
		var data = [];
		var dd = getJson("Dropbox", path, "folder");
		dd.metadata.path = "/";
		dd.children = [];
		data.push(dd);
		client.readdir(path, function(error, entries, folderStat, childrenStat) {
			if (error) {
				return callback(error); // Something went wrong.
			}
			for ( var j in childrenStat) {
				var type = (childrenStat[j].isFolder) ? "folder" : "file";
				var dd = getJson(childrenStat[j].name, path, type);
				data[0].children.push(dd);
			}
			callback(data);
		});
	}

	function getTree(c) {
		var client = c;
		return function(node, callback) {

			var path = "";
			var data = [];
			if (!$(node).data("path")) {
				return initialLoad(node, callback);
			}

			if ($(node).data("path") != "/Dropbox") {
				path = $(node).data("path");

				client.readdir(path, function(error, entries, folderStat, childrenStat) {
					if (error) {
						return callback(error); // Something went wrong.
					}
					for ( var j in childrenStat) {
						var type = (childrenStat[j].isFolder) ? "folder" : "file";
						var dd = getJson(childrenStat[j].name, path, type);
						data.push(dd);
					}
					callback(data);
				});
			} else {
				path = "";
				client.readdir(path, function(error, entries, folderStat, childrenStat) {
					if (error) {
						return callback(error); // Something went wrong.
					}
					for ( var j in childrenStat) {
						var type = (childrenStat[j].isFolder) ? "folder" : "file";
						var dd = getJson(childrenStat[j].name, path, type);
						data.push(dd);
					}
					callback(data);
				});
			}

		}
	}

	function doubleClick(timeout, callback) {
		var self = this;
		this.tLast = (new Date()).getTime();
		this.timeout = timeout;
		this.callback = callback;
		this.nodeLast = null;

		this.clicked = function clicked(e, data) {
			var tNew = (new Date()).getTime();
			var node = $(data.rslt.obj).attr("id");
			var dt = tNew - self.tLast;
			if (dt < self.timeout && node == self.nodeLast) {
				this.callback(data);
			}
			self.tLast = tNew;
			self.nodeLast = node;
		}
	}

	var dClick = new doubleClick(300, function(data) {
		console.log("double clicked");
		open(data.rslt.obj);
	});

	function open(node) {
		var path = $(node).data("path");
		switch ($(node).data("type")) {
		case "folder":
			$(needle).jstree("open_node", node, function() {
				console.log("opended node");
			});
			break;
		default:
		case "file":
			client.readFile(path, function(error, data) {
				if (error) {
					return console.log("error:", error);
				}
				$("#editor-window").html(data);
			});
			break;
		}
	}

	function onCreate(name, node, data) {
		var path = $(node).data("path");
		var id = node.attr("id");
		var type = $(node).data("type");
		// var name = node.name;
		path += "/" + name;
		$(node).data("path", path);
		node.attr("id");
		switch (type) {
		case "folder":
			client.mkdir(path, function(err) {
				if (err) {
					writeMessage("Dropbox could not create folder.");
					return $.jstree.rollback(data.rlbk);
				}
				node.attr("id", node.attr("id") + node.name);
				console.log("directory just created");
			});
			break;
		default:
		case "file":
			client.writeFile(path, "", function(err) {
				if (err) {
					writeMessage("Dropbox could not create file.");
					return $.jstree.rollback(data.rlbk);
				}
				node.attr("id", node.attr("id") + node.name);
				console.log("file just created");
			});
			break;
		}
	}

	function onRemove(name, node, data) {
		var path = node.data("path");
		console.log("trying to delete file: ", path);
		client.remove(path, function(err) {
			if (err) {
				writeMessage("Dropbox could not remove.");
				return $.jstree.rollback(data.rlbk);
			}
			console.log("file just removed");
		});
	}

	function copy(name, node, data) {
		var path = $(needle).jstree("get_selected").data("path");
		var pathToks = path.split("/");
		var name = pathToks[pathToks.length - 1];
		/* var path = node.data("path"); */
		var newName = name + " copy";
		$(needle).jstree("rename_node", node, newName);

		var newPath = "/";
		for ( var i = 0; i < pathToks.length - 2; i++) {
			newPath += (pathToks[i] + "/");
		}
		newPath += newName;

		$(node).attr("id", "node_" + newPath);
		$(node).data("path", newPath);
		console.log("trying to delete file: ", path);
		client.copy(path, newPath, function(err) {
			if (err) {
				writeMessage("Dropbox could not copy.");
				return $.jstree.rollback(data.rlbk);
			}
			console.log("copy successful");
		});
	}

	function modifyCopyName(nameIn, ind) {
		var name = "";
		var nameToks = nameIn.split(".");
		switch (nameIn.indexOf(".")) {
		case -1:
			name += nameIn + "_copy";
			if (ind != null) {
				name += "_" + ind;
			}
			break;
		case 0:
			name += ".";
			var k = 1;
			if (nameToks.length == 2) {
				name += nameToks[k] + "_copy";
				if (ind != null) {
					name += "_" + ind;
				}
			} else {
				for (k; k < nameToks.length - 2; k++) {
					name += nameToks[k] + ".";
				}
				name += nameToks[k++] + "_copy";
				if (ind != null) {
					name += "_" + ind;
				}
				name += "." + nameToks[k];
			}
			break;
		default:
			var k = 0;
			for (k; k < nameToks.length - 2; k++) {
				name += nameToks[k] + ".";
			}
			name += nameToks[k++] + "_copy";
			if (ind != null) {
				name += "_" + ind;
			}
			name += "." + nameToks[k];
			break;
		}
		return name;
	}

	function getChildrenNames(node) {
		var names = [];
		var children = $.jstree._reference('tree-window')._get_children(node);
		for ( var i = 0; i < children.length; i++) {
			var name = $(needle).jstree("get_text", children[i]);
			names.push(name);
		}
		return names;
	}

	function onPaste(data) {
		var parent = data.rslt.obj;
		var child = data.rslt.nodes;
		var name = $(needle).jstree("get_text", child);
		var parentName = $(needle).jstree("get_text", parent);

		var children = getChildrenNames(parent);

		var ind = 0;
		var nameBad = true;
		var origName = name;
		while (nameBad) {
			nameBad = false;
			for ( var k in children) {
				if (children[k] == name) {
					nameBad = true;
					break;
				}
			}
			if (nameBad) {
				if (ind == 0) {
					name = modifyCopyName(origName);
				} else {
					name = modifyCopyName(origName, ind);
				}
			}
			ind++;
		}
		$(needle).jstree("rename_node", child, name);

		var newId = parent.attr("id") + "/" + name;

		var path = child.data("path");
		var newPath = parent.data("path") + "/" + name;

		child.attr("id", newId);
		child.data("path", newPath);
		console.log("trying to copy file: ", newPath);
		client.copy(path, newPath, function(err) {
			if (err) {
				writeMessage("Dropbox could not copy.");
				return $.jstree.rollback(data.rlbk);
			}
			console.log("paste successful");
		});
	}

	var msgTout = null;
	function writeMessage(txt) {
		clearTimeout(msgTout);
		$("#message-window span").html(txt);
		msgTout = setTimeout(function() {
			$("#message-window span").html("");
		}, 5000);
	}

	function filePaste() {
		console.log("pasting node");
		var parent = $(needle).jstree("get_selected");
		// var parentType = parent.data("type");
		var parentPath = parent.data("path");
		var nodePath = copy.data("path");
		if (parentPath = nodePath) {
			parent = $.jstree._reference('tree-window')._get_parent(parent);
		}
		$(needle).jstree("paste", parent);
	}

	function fileCopy() {
		console.log("copying node");
		copy = $(needle).jstree("get_selected");
		$(needle).jstree("copy");
	}

	function fileDelete() {
		var node = $(needle).jstree("get_selected");
		$(needle).jstree("remove", node);
	}

	function fileNew(type) {
		var parent = $(needle).jstree("get_selected");

		var path = "/";
		var position = "inside";
		if (parent && $(parent).data("path")) {
			path = $(parent).data("path");
		}

		if ($(parent).data("type") && $(parent).data("type") == "file") {
			position = "after";
			var pathToks = path.split("/");
			path = "";
			for ( var i = 0; i < pathToks.length - 1; i++) {
				if (pathToks[i] != "") {
					path += ("/" + pathToks[i]);
				}
			}
		}

		var data = {
			attr : {
				id : id
			},
			metadata : {
				path : path,
				type : type
			}
		};
		if (type == "folder") {
			data.state = "closed";
		}

		var id = "node_" + path + "/";
		$(needle).jstree("create", parent, position, data);
	}

	function fileOpen() {
		open($(needle).jstree("get_selected"));
	}

	function createTree(id, cc) {

		writeMessage("loading");
		needle = id;
		client = cc;
		$("#signed-in").html("signed in");
		$("#sign_out").show();
		$("#sign_in").hide();

		client.getUserInfo(function(error, accountInfo) {
			if (error) {
				return showError(error); // Something went wrong.
			}
			console.log(accountInfo);
		});

		$(needle).jstree({
			"json_data" : {
				"data" : getTree(client),
				"progressive_render" : true,
				"progressive_unload" : true
			},
			"plugins" : [ "themes", "json_data", "ui", "crrm" ]
		}).bind("select_node.jstree", function(e, data) {
			dClick.clicked(e, data);
			console.log("node selected:", $(data.rslt.obj).data("path"));
		}).bind("load_node", function(node, success, error) {
			console.log("here");
		}).bind("create.jstree", function(e, data) {
			onCreate(data.rslt.name, data.rslt.obj, data);
		}).bind("remove.jstree", function(e, data) {
			onRemove(data.rslt.name, data.rslt.obj, data);
		}).bind("loaded.jstree", function() {
			writeMessage("Tree loaded");
		}).bind("copy.jstree", function(e, data) {
			console.log("coppying node:", data.rslt.obj.data("path"));
		}).bind("paste.jstree", function(e, data) {
			console.log("pasting node:", data.rslt.obj.data("path"));
			onPaste(data);
		});

		var self = {
			filePaste : filePaste,
			fileCopy : fileCopy,
			fileDelete : fileDelete,
			fileNew : fileNew,
			fileOpen : fileOpen
		};
		return self;
	}

	dtree.createTree = createTree;
})();