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

var walkable = (function () {
var _unwalkableTypes =
['ul','u','ur','l','r','bl','b','br',
 'vdoor-closed','hdoor-closed',
 'ul-in', 'ur-in', 'bl-in', 'br-in'];
var unwalkableTypes = {};
for (var i in _unwalkableTypes) {
	unwalkableTypes[_unwalkableTypes[i]] = true;
}
return (function walkable(type) {
	return !unwalkableTypes[type];
});
})();

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

