var tileset = {
	imagesrc: "lofi_1bit_scifi_a.png", width: 136, height:352,
	tiles: {
		'ul': [5,2], 'u': [6,2], 'ur': [13,2],
		'l' : [5,3],             'r' : [13,3],
		'bl': [5,6], 'b': [6,6], 'br': [13,8],
		'ul-in': [12,8], 'ur-in': [9,6],
		'bl-in': [12,11], 'br-in': [10,11],
		'empty': [0,2],
		'gunk1': [2,35], 'gunk2': [3,35], 'gunk3': [4,35], 'gunk4': [5,35],
		'gunk5': [6,35], 'gunk6': [7,35], 'gunk7': [8,35], 'gunk8': [9,35],
		'gunk9': [10,35], 'gunk10': [11,35],
		'hdoor': [1,19], 'vdoor': [3,19],
		'hdoor-closed': [2,19], 'vdoor-closed': [4,19],

		'player-right': [2,37], 'player-left': [9,37],
		'player-up': [12,37], 'player-down': [4,37],
		'alien-right': [2,39], 'alien-left': [9,39],
		'alien-up': [12,39], 'alien-down': [4,39],
	},
};
tileset.image = new Image(tileset.width, tileset.height);
tileset.image.src = tileset.imagesrc;

var LEFT = 0, RIGHT = 1, UP = 2, DOWN = 3;
function deltaX(dir) {
	if (dir == LEFT) return -1;
	if (dir == RIGHT) return 1;
	return 0;
}
function deltaY(dir) {
	if (dir == UP) return -1;
	if (dir == DOWN) return 1;
	return 0;
}

var _unwalkableTypes =
['ul','u','ur','l','r','bl','b','br',
 'vdoor-closed','hdoor-closed',
 'ul-in', 'ur-in', 'bl-in', 'br-in'];
var unwalkableTypes = {};
for (var i in _unwalkableTypes) {
	unwalkableTypes[_unwalkableTypes[i]] = true;
}
function walkable(type) {
	return !unwalkableTypes[type];
}

function Monster(type, x, y) {
	this.type = type;
	this.x = x;
	this.y = y;

	game.map.at(x, y).monster = this;

	this.moveTo = function (x, y) {
		if (!walkable(game.map.at(x,y).type)) return;
		game.map.at(this.x, this.y).monster = null;
		game.map.at(x,y).monster = this;
		this.x = x;
		this.y = y;
	};
	this.getDisplayType = function () {
		// TODO
		return this.type + '-right';
	}
}

function Tile(x_, y_, type_) {
	var x = x_, y = y_;
	if (!type_) type_ = 'empty';
	this.type = type_;
	this.visible = false;

	this.x = function () { return x; };
	this.y = function () { return y; };

	this.draw = function (ctx) {
		var typeToDraw = null;
		if (this.monster) {
			typeToDraw = this.monster.type;
		} else {
			typeToDraw = this.type;
		}
		if (!this.visible) {
			if (!this.remembered) return;
			typeToDraw = this.remembered;
		}
		if (typeToDraw == 'empty') return;
		this.remembered = this.type;
		var xy = tileset.tiles[typeToDraw];
		ctx.drawImage(tileset.image, xy[0]*8, xy[1]*8, 8, 8, x*8, y*8, 8, 8);
		if (!this.visible) {
			ctx.fillStyle = 'rgba(255,255,255,0.8)'
			ctx.fillRect(x*8, y*8, 8, 8);
		}
	};
}

function action(x,y) {
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

var fov_settings = {
	shape: FOV_SHAPE_CIRCLE,
	opaque: function (map, x, y) { return !walkable(map.at(x,y).type); },
	opaque_apply: FOV_OPAQUE_APPLY,
	apply: function (map, x, y, sx, sy, s) { map.at(x,y).visible = true; }
};

var game = {
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
			fov_circle(fov_settings, this, game.player.x, game.player.y, 30);
			game.map.at(game.player.x, game.player.y).visible = true;
			for (var i = 0; i < this.tiles.length; i++) {
				this.tiles[i].draw(ctx);
			}
		}
	},
};

var walls = new Hash();

function room(x,y,w,h) {
	w -= 1;
	h -= 1;
	game.map.at(x,y).type = 'ul';
	game.map.at(x+w,y).type = 'ur';
	game.map.at(x+w,y+h).type = 'br';
	game.map.at(x,y+h).type = 'bl';
	for (var tx = 1; tx < w; tx++) {
		game.map.at(x+tx,y).type = 'u';
		game.map.at(x+tx,y+h).type = 'b';
		walls.set([x+tx,y], true);
		walls.set([x+tx,y+h], true);
	}
	for (var ty = 1; ty < h; ty++) {
		game.map.at(x,y+ty).type = 'l';
		game.map.at(x+w,y+ty).type = 'r';
		walls.set([x,y+ty], true);
		walls.set([x+w,y+ty], true);
	}

	for (var ty = y+1; ty < y+h; ty++) {
		for (var tx = x+1; tx < x+w; tx++) {
			if (Math.random() < 0.1) {
				game.map.at(tx,ty).type = 'gunk' +
					Math.floor(Math.random()*10+1);
			}
			if (Math.random() < 0.01) {
				game.map.at(tx,ty).monster = new Monster('alien-right', tx, ty);
			}
		}
	}
}

function vdoor(x,y,open) {
	var up = game.map.at(x,y-1);
	var down = game.map.at(x,y+1);

	if (up.type == 'r') {
		up.type = 'bl-in';
		walls.unset([x,y-1]);
	} else if (up.type == 'ur') {
		up.type = 'u';
		walls.set([x,y-1], true);
	} else if (up.type == 'l') {
		up.type = 'br-in';
		walls.unset([x,y-1]);
	} else if (up.type == 'ul') {
		up.type = 'u';
		walls.set([x,y-1], true);
	}

	if (down.type == 'r') {
		down.type = 'ul-in';
		walls.unset([x,y+1]);
	} else if (down.type == 'br') {
		down.type = 'b';
		walls.set([x,y+1], true);
	} else if (down.type == 'l') {
		down.type = 'ur-in';
		walls.unset([x,y+1]);
	} else if (down.type == 'bl') {
		down.type = 'b';
		walls.set([x,y+1], true);
	}

	game.map.at(x,y).type = open ? 'vdoor' : 'vdoor-closed';
	walls.unset([x,y]);
}

function hdoor(x,y,open) {
	var left = game.map.at(x-1,y);
	var right = game.map.at(x+1,y);

	if (left.type == 'b') {
		left.type = 'ur-in';
		walls.unset([x-1,y]);
	} else if (left.type == 'bl') {
		left.type = 'l';
		walls.set([x-1,y], true);
	} else if (left.type == 'u') {
		left.type = 'br-in';
		walls.unset([x-1,y]);
	} else if (left.type == 'ul') {
		left.type = 'l';
		walls.set([x-1,y], true);
	}

	if (right.type == 'b') {
		right.type = 'ul-in';
		walls.unset([x+1,y]);
	} else if (right.type == 'br') {
		right.type = 'r';
		walls.set([x+1,y], true);
	} else if (right.type == 'u') {
		right.type = 'bl-in';
		walls.unset([x+1,y]);
	} else if (right.type == 'ur') {
		right.type = 'r';
		walls.set([x+1,y], true);
	}

	game.map.at(x,y).type = open ? 'hdoor' : 'hdoor-closed';
	walls.unset([x,y]);
}

function hcorridor(x1,x2,y) {
	for (var x = x1+1; x < x2; x++) {
		game.map.at(x,y-1).type = 'u';
		game.map.at(x,y+1).type = 'b';
		if (x > x1+1 && x < x2-1) {
			walls.set([x,y-1], true);
			walls.set([x,y+1], true);
		}
	}
}

function vcorridor(x,y1,y2) {
	for (var y = y1+1; y < y2; y++) {
		game.map.at(x-1,y).type = 'l';
		game.map.at(x+1,y).type = 'r';
		if (y > y1+1 && y < y2-1) {
			walls.set([x-1,y], true);
			walls.set([x+1,y], true);
		}
	}
}

function allClear(x,y,w,h) {
	for (var j = 0; j < h; j++) {
		for (var i = 0; i < w; i++) {
			if (x < 0 || x+i >= game.map.width ||
					y < 0 || y+j >= game.map.height)
				return false;
			if (game.map.at(x+i,y+j).type != 'empty') {
				return false;
			}
		}
	}
	return true;
}

function randInt (max) {
	return Math.floor(Math.random()*max);
}

function begin () {
	game.canvas = document.getElementById('canvas');
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


// load resources
var resources = [window, tileset.image];
var loaded = 0;

resources.each(function (r) {
	r.onload = function () {
		loaded++;
		if (loaded == resources.length) {
			begin();
		}
	}
})
