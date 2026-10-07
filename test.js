(function (Scratch) {
  "use strict";

  class MonsterBrawlCollision {
    constructor() {
      this.targets = new Map();
      this.nextId = 1;

      this.maxIterations = 8;
      this.defaultRadius = 20;
      this.epsilon = 0.01;
    }

    getInfo() {
      return {
        id: "monsterbrawlcollision",
        name: "Monster Brawl Collision",
        color1: "#e84a5f",
        color2: "#c83b4d",
        color3: "#a52e3e",

        blocks: [
          {
            opcode: "register",
            blockType: Scratch.BlockType.COMMAND,
            text: "register collision body [NAME] radius [RADIUS]"
          },
          {
            opcode: "unregister",
            blockType: Scratch.BlockType.COMMAND,
            text: "unregister collision body [NAME]"
          },
          {
            opcode: "setRadius",
            blockType: Scratch.BlockType.COMMAND,
            text: "set collision radius of [NAME] to [RADIUS]"
          },
          {
            opcode: "setPosition",
            blockType: Scratch.BlockType.COMMAND,
            text: "set collision position of [NAME] to x [X] y [Y]"
          },
          {
            opcode: "move",
            blockType: Scratch.BlockType.COMMAND,
            text: "move [NAME] by x [DX] y [DY]"
          },
          {
            opcode: "colliding",
            blockType: Scratch.BlockType.BOOLEAN,
            text: "[A] is colliding with [B]?"
          },
          {
            opcode: "separate",
            blockType: Scratch.BlockType.COMMAND,
            text: "separate [A] from [B]"
          },
          {
            opcode: "resolve",
            blockType: Scratch.BlockType.COMMAND,
            text: "resolve all collisions"
          },
          {
            opcode: "fence",
            blockType: Scratch.BlockType.COMMAND,
            text: "fence [NAME] inside left [LEFT] right [RIGHT] bottom [BOTTOM] top [TOP]"
          },
          {
            opcode: "fenceAll",
            blockType: Scratch.BlockType.COMMAND,
            text: "fence all bodies inside left [LEFT] right [RIGHT] bottom [BOTTOM] top [TOP]"
          },
          {
            opcode: "x",
            blockType: Scratch.BlockType.REPORTER,
            text: "collision x of [NAME]"
          },
          {
            opcode: "y",
            blockType: Scratch.BlockType.REPORTER,
            text: "collision y of [NAME]"
          },
          {
            opcode: "distance",
            blockType: Scratch.BlockType.REPORTER,
            text: "distance between [A] and [B]"
          },
          {
            opcode: "overlap",
            blockType: Scratch.BlockType.REPORTER,
            text: "overlap between [A] and [B]"
          }
        ]
      };
    }

    _name(args) {
      return String(args.NAME);
    }

    _number(value, fallback = 0) {
      const n = Number(value);
      return Number.isFinite(n) ? n : fallback;
    }

    _get(name) {
      return this.targets.get(String(name));
    }

    register(args) {
      const name = this._name(args);

      this.targets.set(name, {
        id: this.nextId++,
        x: 0,
        y: 0,
        radius: Math.max(0, this._number(args.RADIUS, this.defaultRadius))
      });
    }

    unregister(args) {
      this.targets.delete(this._name(args));
    }

    setRadius(args) {
      const body = this._get(args.NAME);
      if (!body) return;

      body.radius = Math.max(
        0,
        this._number(args.RADIUS, body.radius)
      );
    }

    setPosition(args) {
      const body = this._get(args.NAME);
      if (!body) return;

      body.x = this._number(args.X, body.x);
      body.y = this._number(args.Y, body.y);
    }

    move(args) {
      const body = this._get(args.NAME);
      if (!body) return;

      body.x += this._number(args.DX);
      body.y += this._number(args.DY);
    }

    colliding(args) {
      const a = this._get(args.A);
      const b = this._get(args.B);

      if (!a || !b || a === b) return false;

      const dx = b.x - a.x;
      const dy = b.y - a.y;

      const distanceSquared = dx * dx + dy * dy;
      const radius = a.radius + b.radius;

      return distanceSquared < radius * radius;
    }

    _separateBodies(a, b) {
      if (!a || !b || a === b) return;

      let dx = b.x - a.x;
      let dy = b.y - a.y;

      let distSquared = dx * dx + dy * dy;
      const minDistance = a.radius + b.radius;

      // They are not overlapping.
      if (distSquared >= minDistance * minDistance) {
        return;
      }

      let distance = Math.sqrt(distSquared);

      // Prevent division by zero when two clones occupy
      // exactly the same position.
      if (distance < this.epsilon) {
        const angle = ((a.id * 0.754877666) % 1) * Math.PI * 2;

        dx = Math.cos(angle);
        dy = Math.sin(angle);

        distance = 1;
      } else {
        dx /= distance;
        dy /= distance;
      }

      const ***** = minDistance - distance;

      /*
       * Split the correction between the two bodies.
       *
       * This is important:
       * moving only one object can cause the other object
       * to immediately push it back on the next frame.
       */
      const push = ***** / 2 + this.epsilon;

      a.x -= dx * push;
      a.y -= dy * push;

      b.x += dx * push;
      b.y += dy * push;
    }

    separate(args) {
      const a = this._get(args.A);
      const b = this._get(args.B);

      this._separateBodies(a, b);
    }

    resolve() {
      const bodies = Array.from(this.targets.values());

      /*
       * Multiple passes are used because pushing one body out
       * of another can create a new overlap with a third body.
       */
      for (let iteration = 0; iteration < this.maxIterations; iteration++) {
        let changed = false;

        for (let i = 0; i < bodies.length; i++) {
          for (let j = i + 1; j < bodies.length; j++) {
            const a = bodies[i];
            const b = bodies[j];

            const dx = b.x - a.x;
            const dy = b.y - a.y;

            const minDistance = a.radius + b.radius;

            if (
              dx * dx + dy * dy <
              minDistance * minDistance
            ) {
              this._separateBodies(a, b);
              changed = true;
            }
          }
        }

        if (!changed) break;
      }
    }

    fence(args) {
      const body = this._get(args.NAME);
      if (!body) return;

      const left = this._number(args.LEFT);
      const right = this._number(args.RIGHT);
      const bottom = this._number(args.BOTTOM);
      const top = this._number(args.TOP);

      /*
       * The radius is included in the fence limits so the
       * entire collision body stays inside the arena.
       */
      body.x = Math.max(
        left + body.radius,
        Math.min(right - body.radius, body.x)
      );

      body.y = Math.max(
        bottom + body.radius,
        Math.min(top - body.radius, body.y)
      );
    }

    fenceAll(args) {
      for (const [name] of this.targets) {
        this.fence({
          NAME: name,
          LEFT: args.LEFT,
          RIGHT: args.RIGHT,
          BOTTOM: args.BOTTOM,
          TOP: args.TOP
        });
      }
    }

    x(args) {
      const body = this._get(args.NAME);
      return body ? body.x : 0;
    }

    y(args) {
      const body = this._get(args.NAME);
      return body ? body.y : 0;
    }

    distance(args) {
      const a = this._get(args.A);
      const b = this._get(args.B);

      if (!a || !b) return 0;

      return Math.hypot(
        b.x - a.x,
        b.y - a.y
      );
    }

    overlap(args) {
      const a = this._get(args.A);
      const b = this._get(args.B);

      if (!a || !b || a === b) return 0;

      const distance = Math.hypot(
        b.x - a.x,
        b.y - a.y
      );

      return Math.max(
        0,
        (a.radius + b.radius) - distance
      );
    }
  }

  Scratch.extensions.register(new MonsterBrawlCollision());
})(Scratch);
