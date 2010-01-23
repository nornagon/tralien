require(['util.js','tileset.js','map.js','fov.js','monster.js'], function () {
	setTimeout(function(){
	if (document.loaded) { begin(); }
	else { document.observe('load', begin); }
	},0);
});

function action(x,y) {
	// perform an action at (x,y)
	// TODO: should be dir?
	if (game.map.at(x,y).type == 'vdoor-closed') {
		game.map.at(x,y).type = 'vdoor';
		return false;
	}
	if (game.map.at(x,y).type == 'hdoor-closed') {
		game.map.at(x,y).type = 'hdoor';
		return false;
	}
	return true;
}

function ctrlAction(dir) {
	var x = game.player.x + deltaX(dir);
	var y = game.player.y + deltaY(dir);
	if (game.map.at(x,y).type == 'vdoor') {
		game.map.at(x,y).type = 'vdoor-closed';
	}
	if (game.map.at(x,y).type == 'hdoor') {
		game.map.at(x,y).type = 'hdoor-closed';
	}
}

function begin () {
	console.log('begin()');

	var fov_settings = {
		shape: fov.SHAPE_CIRCLE,
		opaque: function (map, x, y) { return !walkable(map.at(x,y).type); },
		opaque_apply: true,
		apply: function (map, x, y, sx, sy) { map.at(x,y).visible = true; }
	};

	// global
	game = {
		map: {
			width: null, height: null,
			tiles: [],
			at: function (x,y) {
				return this.tiles[y*this.width+x];
			},
			draw: function () {
				var ctx = game.canvas.getContext('2d');
				ctx.clearRect(0, 0, game.canvas.width, game.canvas.height);
				for (var i = 0; i < this.tiles.length; i++) {
					this.tiles[i].visible = false;
				}
				fov.circle(fov_settings, this, game.player.x, game.player.y, 30);
				game.map.at(game.player.x, game.player.y).visible = true;
				for (var i = 0; i < this.tiles.length; i++) {
					this.tiles[i].draw(ctx);
				}
			}
		},
	};

	game.canvas = $('canvas');
	game.map.width = Math.floor(game.canvas.width/8);
	game.map.height = Math.floor(game.canvas.height/8);
	for (var y = 0; y < game.map.height; y++) {
		for (var x = 0; x < game.map.width; x++) {
			game.map.tiles[y*game.map.width+x] = new Tile(x,y);
		}
	}

	var w = 4 + randInt(16);
	var h = 4 + randInt(16);
	var x = randInt(game.map.width - w-1);
	var y = randInt(game.map.height - h-1);
	room(x,y,w,h);

	game.player = new Monster('player-right', x+randInt(w-2)+1, y+randInt(h-2)+1);

	// generate the map

	var nfailed = 0;

	while (nfailed < 100) {
		var wall = walls.keys()[randInt(walls.keys().size())].split(/,/);
		var wx = parseInt(wall[0]), wy = parseInt(wall[1]);
		var wallType = game.map.at(wx,wy).type;
		if (!(wallType == 'u' || wallType == 'r' || wallType == 'l' ||
			wallType == 'b')) {
			console.log("bad wall type? '" + wallType + "'");
			walls.unset([wx,wy]);
		}
		var w = 4 + randInt(16), h = 4 + randInt(16);
		var corridorLength = randInt(8);

		// check there's room for corridor
		if (
			(wallType == 'u' &&
				!allClear(wx-1,wy-corridorLength,3,corridorLength))
		||
			(wallType == 'b' &&
				!allClear(wx-1,wy+1,3,corridorLength))
		||
			(wallType == 'r' &&
				!allClear(wx+1,wy-1,corridorLength,3))
		||
			(wallType == 'l' &&
				!allClear(wx-corridorLength,wy-1,corridorLength,3))
		) {
			nfailed++;
			continue;
		}

		var rx, ry;
		var foundASpot = false;
		if (wallType == 'u' || wallType == 'b') {
			rx = wx - Math.floor(w/2);
			ry = (wallType == 'u' ? wy - corridorLength - h
														: wy + 1 + corridorLength);
			// dx = 0, 1, -1, 2, -2, ...
			var l = Math.floor(-(w-2)/2),
					r = Math.floor((w-2)/2);
			for (var dx = 0; dx > l && dx <= r; dx = -dx + (dx <= 0 ? 1 : 0)) {
				if (allClear(rx+dx,ry,w,h)) {
					foundASpot = true;
					rx += dx;
					break;
				}
			}
		} else if (wallType == 'l' || wallType == 'r') {
			rx = (wallType == 'l' ? wx - corridorLength - w
														: wx + 1 + corridorLength);
			ry = wy - Math.floor(h/2);
			// dy = 0, 1, -1, 2, -2, ...
			var u = Math.floor(-(h-2)/2),
					b = Math.floor((h-2)/2);
			var foundASpot = false;
			for (var dy = 0; dy > u && dy <= b; dy = -dy + (dy <= 0 ? 1 : 0)) {
				if (allClear(rx,ry+dy,w,h)) {
					foundASpot = true;
					ry += dy;
					break;
				}
			}
		}

		// couldn't find a spot to put the room
		if (!foundASpot) {
			nfailed++;
			continue;
		}

		room(rx,ry,w,h);
		if (wallType == 'u') {
			vcorridor(wx,ry+h-1,wy);
			hdoor(wx,wy);
			hdoor(wx,ry+h-1);
		} else if (wallType == 'b') {
			vcorridor(wx,wy,ry);
			hdoor(wx,wy);
			hdoor(wx,ry);
		} else if (wallType == 'r') {
			hcorridor(wx,rx,wy);
			vdoor(wx,wy);
			vdoor(rx,wy);
		} else if (wallType == 'l') {
			hcorridor(rx+w-1,wx,wy);
			vdoor(wx,wy);
			vdoor(rx+w-1,wy);
		}
	}

	game.map.draw();

	// register for key events

	document.onkeydown = function (e) {
		var oldX = game.player.x, oldY = game.player.y;
		switch (e.keyCode) {
			case 37: // left
				if (e.ctrlKey) {
					ctrlAction(LEFT);
				} else if (action(game.player.x-1,game.player.y)) {
					game.player.moveTo(game.player.x-1,game.player.y);
				}
				game.player.type = 'player-left';
				e.returnValue = false;
				break;
			case 39: // right
				if (e.ctrlKey) {
					ctrlAction(RIGHT);
				} else if (action(game.player.x+1,game.player.y)) {
					game.player.moveTo(game.player.x+1,game.player.y);
				}
				game.player.type = 'player-right';
				e.returnValue = false;
				break;
			case 38: // up
				if (e.ctrlKey) {
					ctrlAction(UP);
				} else if (action(game.player.x,game.player.y-1)) {
					game.player.moveTo(game.player.x,game.player.y-1);
				}
				game.player.type = 'player-up';
				e.returnValue = false;
				break;
			case 40: // down
				if (e.ctrlKey) {
					ctrlAction(DOWN);
				} else if (action(game.player.x,game.player.y+1)) {
					game.player.moveTo(game.player.x,game.player.y+1);
				}
				game.player.type = 'player-down';
				e.returnValue = false;
				break;
		}
		game.map.draw();
	}
}
