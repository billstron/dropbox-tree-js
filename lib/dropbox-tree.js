(function() {

	if (typeof dtree == "undefined") {
		dtree = {};
	}

	function DBoxTree(needle, client) {
		var self = this;

		this.getTree = function getTree(node, callback) {

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
		};

		var initialLoad = function initialLoad(node, callback) {
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
		};

		this.onCreate = function onCreate(name, node, data) {
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
		};

		this.onRemove = function onRemove(name, node, data) {
			var path = node.data("path");
			console.log("trying to delete file: ", path);
			client.remove(path, function(err) {
				if (err) {
					writeMessage("Dropbox could not remove.");
					return $.jstree.rollback(data.rlbk);
				}
				console.log("file just removed");
			});
		};

		this.onPaste = function onPaste(data) {
			var parent = data.rslt.obj;
			var child = data.rslt.nodes;
			var name = $(needle).jstree("get_text", child);

			var children = getChildrenNames(needle, parent);

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
		};

		var msgTout = null;
		this.writeMessage = function writeMessage(txt) {
			clearTimeout(msgTout);
			$("#message-window span").html(txt);
			msgTout = setTimeout(function() {
				$("#message-window span").html("");
			}, 5000);
		};

		this.filePaste = function filePaste() {
			console.log("pasting node");
			var parent = $(needle).jstree("get_selected");
			var parentPath = parent.data("path");
			var nodePath = copy.data("path");
			if (parentPath = nodePath) {
				parent = $.jstree._reference(needle)._get_parent(parent);
			}
			$(needle).jstree("paste", parent);
		};

		this.fileCopy = function fileCopy() {
			console.log("copying node");
			copy = $(needle).jstree("get_selected");
			$(needle).jstree("copy");
		};

		this.fileDelete = function fileDelete() {
			var node = $(needle).jstree("get_selected");
			$(needle).jstree("remove", node);
		};

		this.fileNew = function fileNew(type) {
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

			var id = "node_" + path + "/";
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

			$(needle).jstree("create", parent, position, data);
		};

		this.fileOpen = function fileOpen(node) {
			if (!node) {
				node = $(needle).jstree("get_selected");
			}

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
		};

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

	function getChildrenNames(needle, node) {
		var names = [];
		var children = $.jstree._reference(needle)._get_children(node);
		for ( var i = 0; i < children.length; i++) {
			var name = $(needle).jstree("get_text", children[i]);
			names.push(name);
		}
		return names;
	}

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

	function createTree(needle, client) {

		var tree = new DBoxTree(needle, client);
		tree.writeMessage("loading");

		client.getUserInfo(function(error, accountInfo) {
			if (error) {
				return showError(error); // Something went wrong.
			}
			console.log(accountInfo);
		});

		$(needle).jstree({
			"json_data" : {
				"data" : tree.getTree,
				"progressive_render" : true,
				"progressive_unload" : true
			},"crrm" : {
				"move" :{
					"default_position" : "inside"
				}
			}, "themes":{
				"theme" : "dtree"
			},
			"plugins" : [ "themes", "json_data", "ui", "crrm" ]
		}).bind("select_node.jstree", function(e, data) {
			console.log("node selected:", $(data.rslt.obj).data("path"));
		}).bind("load_node", function(node, success, error) {

		}).bind("create.jstree", function(e, data) {
			tree.onCreate(data.rslt.name, data.rslt.obj, data);
		}).bind("remove.jstree", function(e, data) {
			tree.onRemove(data.rslt.name, data.rslt.obj, data);
		}).bind("loaded.jstree", function() {
			tree.writeMessage("Tree loaded");
		}).bind("copy.jstree", function(e, data) {
			console.log("coppying node:", data.rslt.obj.data("path"));
		}).bind("paste.jstree", function(e, data) {
			console.log("pasting node:", data.rslt.obj.data("path"));
			tree.onPaste(data);
		}).bind("dblclick.jstree", function(object) {
			var node = $(event.target).closest("li");
			tree.fileOpen(node);
		});

		return tree;
	}

	dtree.createTree = createTree;
})();