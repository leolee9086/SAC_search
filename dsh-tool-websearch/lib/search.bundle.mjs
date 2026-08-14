var __defProp = Object.defineProperty;
var __returnValue = (v) => v;
function __exportSetter(name, newValue) {
  this[name] = __returnValue.bind(null, newValue);
}
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, {
      get: all[name],
      enumerable: true,
      configurable: true,
      set: __exportSetter.bind(all, name)
    });
};
// node_modules/effect/dist/Data.js
var exports_Data = {};
__export(exports_Data, {
  taggedEnum: () => taggedEnum,
  TaggedError: () => TaggedError2,
  TaggedClass: () => TaggedClass,
  Error: () => Error3,
  Class: () => Class3
});

// node_modules/effect/dist/Pipeable.js
var pipeArguments = (self, args) => {
  switch (args.length) {
    case 0:
      return self;
    case 1:
      return args[0](self);
    case 2:
      return args[1](args[0](self));
    case 3:
      return args[2](args[1](args[0](self)));
    case 4:
      return args[3](args[2](args[1](args[0](self))));
    case 5:
      return args[4](args[3](args[2](args[1](args[0](self)))));
    case 6:
      return args[5](args[4](args[3](args[2](args[1](args[0](self))))));
    case 7:
      return args[6](args[5](args[4](args[3](args[2](args[1](args[0](self)))))));
    case 8:
      return args[7](args[6](args[5](args[4](args[3](args[2](args[1](args[0](self))))))));
    case 9:
      return args[8](args[7](args[6](args[5](args[4](args[3](args[2](args[1](args[0](self)))))))));
    default: {
      let ret = self;
      for (let i = 0, len = args.length;i < len; i++) {
        ret = args[i](ret);
      }
      return ret;
    }
  }
};
var Prototype = {
  pipe() {
    return pipeArguments(this, arguments);
  }
};
var Class = /* @__PURE__ */ function() {
  function PipeableBase() {}
  PipeableBase.prototype = Prototype;
  return PipeableBase;
}();

// node_modules/effect/dist/Function.js
var dual = function(arity, body) {
  if (typeof arity === "function") {
    return function() {
      return arity(arguments) ? body.apply(this, arguments) : (self) => body(self, ...arguments);
    };
  }
  switch (arity) {
    case 0:
    case 1:
      throw new RangeError(`Invalid arity ${arity}`);
    case 2:
      return function(a, b) {
        if (arguments.length >= 2) {
          return body(a, b);
        }
        return function(self) {
          return body(self, a);
        };
      };
    case 3:
      return function(a, b, c) {
        if (arguments.length >= 3) {
          return body(a, b, c);
        }
        return function(self) {
          return body(self, a, b);
        };
      };
    default:
      return function() {
        if (arguments.length >= arity) {
          return body.apply(this, arguments);
        }
        const args = arguments;
        return function(self) {
          return body(self, ...args);
        };
      };
  }
};
var identity = (a) => a;
var constant = (value) => () => value;
var constTrue = /* @__PURE__ */ constant(true);
var constFalse = /* @__PURE__ */ constant(false);
var constUndefined = /* @__PURE__ */ constant(undefined);
var constVoid = constUndefined;
function flow(ab, bc, cd, de, ef, fg, gh, hi, ij) {
  switch (arguments.length) {
    case 1:
      return ab;
    case 2:
      return function() {
        return bc(ab.apply(this, arguments));
      };
    case 3:
      return function() {
        return cd(bc(ab.apply(this, arguments)));
      };
    case 4:
      return function() {
        return de(cd(bc(ab.apply(this, arguments))));
      };
    case 5:
      return function() {
        return ef(de(cd(bc(ab.apply(this, arguments)))));
      };
    case 6:
      return function() {
        return fg(ef(de(cd(bc(ab.apply(this, arguments))))));
      };
    case 7:
      return function() {
        return gh(fg(ef(de(cd(bc(ab.apply(this, arguments)))))));
      };
    case 8:
      return function() {
        return hi(gh(fg(ef(de(cd(bc(ab.apply(this, arguments))))))));
      };
    case 9:
      return function() {
        return ij(hi(gh(fg(ef(de(cd(bc(ab.apply(this, arguments)))))))));
      };
  }
  return;
}
function memoize(f) {
  const cache = new WeakMap;
  return (a) => {
    if (cache.has(a)) {
      return cache.get(a);
    }
    const result = f(a);
    cache.set(a, result);
    return result;
  };
}

// node_modules/effect/dist/internal/equal.js
var getAllObjectKeys = (obj) => {
  const keys = new Set(Reflect.ownKeys(obj));
  if (obj.constructor === Object)
    return keys;
  if (obj instanceof Error) {
    keys.delete("stack");
  }
  const proto = Object.getPrototypeOf(obj);
  let current = proto;
  while (current !== null && current !== Object.prototype) {
    const ownKeys = Reflect.ownKeys(current);
    for (let i = 0;i < ownKeys.length; i++) {
      keys.add(ownKeys[i]);
    }
    current = Object.getPrototypeOf(current);
  }
  if (keys.has("constructor") && typeof obj.constructor === "function" && proto === obj.constructor.prototype) {
    keys.delete("constructor");
  }
  return keys;
};
var byReferenceInstances = /* @__PURE__ */ new WeakSet;

// node_modules/effect/dist/Predicate.js
function isString(input) {
  return typeof input === "string";
}
function isNumber(input) {
  return typeof input === "number";
}
function isFunction(input) {
  return typeof input === "function";
}
function isNotUndefined(input) {
  return input !== undefined;
}
function isNotNullish(input) {
  return input != null;
}
function isUnknown(_) {
  return true;
}
function isObjectKeyword(input) {
  return typeof input === "object" && input !== null || isFunction(input);
}
var hasProperty = /* @__PURE__ */ dual(2, (self, property) => isObjectKeyword(self) && (property in self));
var isTagged = /* @__PURE__ */ dual(2, (self, tag) => hasProperty(self, "_tag") && self["_tag"] === tag);
function isIterable(input) {
  return hasProperty(input, Symbol.iterator) || isString(input);
}
var or = /* @__PURE__ */ dual(2, (self, that) => (a) => self(a) || that(a));

// node_modules/effect/dist/Hash.js
var symbol = "~effect/interfaces/Hash";
var hash = (self) => {
  switch (typeof self) {
    case "number":
      return number(self);
    case "bigint":
      return string(self.toString(10));
    case "boolean":
      return string(String(self));
    case "symbol":
      return string(String(self));
    case "string":
      return string(self);
    case "undefined":
      return string("undefined");
    case "function":
    case "object": {
      if (self === null) {
        return string("null");
      } else if (self instanceof Date) {
        return string(self.toISOString());
      } else if (self instanceof RegExp) {
        return string(self.toString());
      } else {
        if (byReferenceInstances.has(self)) {
          return random(self);
        }
        if (hashCache.has(self)) {
          return hashCache.get(self);
        }
        const h = withVisitedTracking(self, () => {
          if (isHash(self)) {
            return self[symbol]();
          } else if (typeof self === "function") {
            return random(self);
          } else if (Array.isArray(self) || ArrayBuffer.isView(self)) {
            return array(self);
          } else if (self instanceof Map) {
            return hashMap(self);
          } else if (self instanceof Set) {
            return hashSet(self);
          }
          return structure(self);
        });
        hashCache.set(self, h);
        return h;
      }
    }
    default:
      throw new Error(`BUG: unhandled typeof ${typeof self} - please report an issue at https://github.com/Effect-TS/effect/issues`);
  }
};
var random = (self) => {
  if (!randomHashCache.has(self)) {
    randomHashCache.set(self, number(Math.floor(Math.random() * Number.MAX_SAFE_INTEGER)));
  }
  return randomHashCache.get(self);
};
var combine = /* @__PURE__ */ dual(2, (self, b) => self * 53 ^ b);
var optimize = (n) => n & 3221225471 | n >>> 1 & 1073741824;
var isHash = (u) => hasProperty(u, symbol);
var number = (n) => {
  if (n !== n) {
    return string("NaN");
  }
  if (n === Infinity) {
    return string("Infinity");
  }
  if (n === -Infinity) {
    return string("-Infinity");
  }
  let h = n | 0;
  if (h !== n) {
    h ^= n * 4294967295;
  }
  while (n > 4294967295) {
    h ^= n /= 4294967295;
  }
  return optimize(h);
};
var string = (str) => {
  let h = 5381, i = str.length;
  while (i) {
    h = h * 33 ^ str.charCodeAt(--i);
  }
  return optimize(h);
};
var structureKeys = (o, keys) => {
  let h = 12289;
  for (const key of keys) {
    h ^= combine(hash(key), hash(o[key]));
  }
  return optimize(h);
};
var structure = (o) => structureKeys(o, getAllObjectKeys(o));
var iterableWith = (seed, f) => (iter) => {
  let h = seed;
  for (const element of iter) {
    h ^= f(element);
  }
  return optimize(h);
};
var array = /* @__PURE__ */ iterableWith(6151, hash);
var hashMap = /* @__PURE__ */ iterableWith(/* @__PURE__ */ string("Map"), ([k, v]) => combine(hash(k), hash(v)));
var hashSet = /* @__PURE__ */ iterableWith(/* @__PURE__ */ string("Set"), hash);
var randomHashCache = /* @__PURE__ */ new WeakMap;
var hashCache = /* @__PURE__ */ new WeakMap;
var visitedObjects = /* @__PURE__ */ new WeakSet;
function withVisitedTracking(obj, fn) {
  if (visitedObjects.has(obj)) {
    return string("[Circular]");
  }
  visitedObjects.add(obj);
  const result = fn();
  visitedObjects.delete(obj);
  return result;
}

// node_modules/effect/dist/Equal.js
var symbol2 = "~effect/interfaces/Equal";
function equals() {
  if (arguments.length === 1) {
    return (self) => compareBoth(self, arguments[0]);
  }
  return compareBoth(arguments[0], arguments[1]);
}
function compareBoth(self, that) {
  if (self === that)
    return true;
  if (self == null || that == null)
    return false;
  const selfType = typeof self;
  if (selfType !== typeof that) {
    return false;
  }
  if (selfType === "number" && self !== self && that !== that) {
    return true;
  }
  if (selfType !== "object" && selfType !== "function") {
    return false;
  }
  if (byReferenceInstances.has(self) || byReferenceInstances.has(that)) {
    return false;
  }
  return withCache(self, that, compareObjects);
}
function withVisitedTracking2(self, that, fn) {
  const hasLeft = visitedLeft.has(self);
  const hasRight = visitedRight.has(that);
  if (hasLeft && hasRight) {
    return true;
  }
  if (hasLeft || hasRight) {
    return false;
  }
  visitedLeft.add(self);
  visitedRight.add(that);
  const result = fn();
  visitedLeft.delete(self);
  visitedRight.delete(that);
  return result;
}
var visitedLeft = /* @__PURE__ */ new WeakSet;
var visitedRight = /* @__PURE__ */ new WeakSet;
function compareObjects(self, that) {
  if (hash(self) !== hash(that)) {
    return false;
  } else if (self instanceof Date) {
    if (!(that instanceof Date))
      return false;
    return self.toISOString() === that.toISOString();
  } else if (self instanceof RegExp) {
    if (!(that instanceof RegExp))
      return false;
    return self.toString() === that.toString();
  }
  const selfIsEqual = isEqual(self);
  const thatIsEqual = isEqual(that);
  if (selfIsEqual !== thatIsEqual)
    return false;
  const bothEquals = selfIsEqual && thatIsEqual;
  if (typeof self === "function" && !bothEquals) {
    return false;
  }
  return withVisitedTracking2(self, that, () => {
    if (bothEquals) {
      return self[symbol2](that);
    } else if (Array.isArray(self)) {
      if (!Array.isArray(that) || self.length !== that.length) {
        return false;
      }
      return compareArrays(self, that);
    } else if (ArrayBuffer.isView(self)) {
      if (!ArrayBuffer.isView(that) || self.byteLength !== that.byteLength) {
        return false;
      }
      return compareTypedArrays(self, that);
    } else if (self instanceof Map) {
      if (!(that instanceof Map) || self.size !== that.size) {
        return false;
      }
      return compareMaps(self, that);
    } else if (self instanceof Set) {
      if (!(that instanceof Set) || self.size !== that.size) {
        return false;
      }
      return compareSets(self, that);
    }
    return compareRecords(self, that);
  });
}
function withCache(self, that, f) {
  let selfMap = equalityCache.get(self);
  if (!selfMap) {
    selfMap = new WeakMap;
    equalityCache.set(self, selfMap);
  } else if (selfMap.has(that)) {
    return selfMap.get(that);
  }
  const result = f(self, that);
  selfMap.set(that, result);
  let thatMap = equalityCache.get(that);
  if (!thatMap) {
    thatMap = new WeakMap;
    equalityCache.set(that, thatMap);
  }
  thatMap.set(self, result);
  return result;
}
var equalityCache = /* @__PURE__ */ new WeakMap;
function compareArrays(self, that) {
  for (let i = 0;i < self.length; i++) {
    if (!compareBoth(self[i], that[i])) {
      return false;
    }
  }
  return true;
}
function compareTypedArrays(self, that) {
  if (self.length !== that.length) {
    return false;
  }
  for (let i = 0;i < self.length; i++) {
    if (self[i] !== that[i]) {
      return false;
    }
  }
  return true;
}
function compareRecords(self, that) {
  const selfKeys = getAllObjectKeys(self);
  const thatKeys = getAllObjectKeys(that);
  if (selfKeys.size !== thatKeys.size) {
    return false;
  }
  for (const key of selfKeys) {
    if (!thatKeys.has(key) || !compareBoth(self[key], that[key])) {
      return false;
    }
  }
  return true;
}
function makeCompareMap(keyEquivalence, valueEquivalence) {
  return function compareMaps(self, that) {
    for (const [selfKey, selfValue] of self) {
      let found = false;
      for (const [thatKey, thatValue] of that) {
        if (keyEquivalence(selfKey, thatKey) && valueEquivalence(selfValue, thatValue)) {
          found = true;
          break;
        }
      }
      if (!found) {
        return false;
      }
    }
    return true;
  };
}
var compareMaps = /* @__PURE__ */ makeCompareMap(compareBoth, compareBoth);
function makeCompareSet(equivalence) {
  return function compareSets(self, that) {
    for (const selfValue of self) {
      let found = false;
      for (const thatValue of that) {
        if (equivalence(selfValue, thatValue)) {
          found = true;
          break;
        }
      }
      if (!found) {
        return false;
      }
    }
    return true;
  };
}
var compareSets = /* @__PURE__ */ makeCompareSet(compareBoth);
var isEqual = (u) => hasProperty(u, symbol2);
var asEquivalence = () => equals;
var byReferenceUnsafe = (obj) => {
  byReferenceInstances.add(obj);
  return obj;
};

// node_modules/effect/dist/Redactable.js
var symbolRedactable = /* @__PURE__ */ Symbol.for("~effect/Redactable");
var isRedactable = (u) => hasProperty(u, symbolRedactable);
function redact(u) {
  if (isRedactable(u))
    return getRedacted(u);
  return u;
}
function getRedacted(redactable) {
  return redactable[symbolRedactable](globalThis[currentFiberTypeId]?.context ?? emptyContext);
}
var currentFiberTypeId = "~effect/Fiber/currentFiber";
var emptyContext = {
  "~effect/Context": {},
  mapUnsafe: /* @__PURE__ */ new Map,
  pipe() {
    return pipeArguments(this, arguments);
  }
};

// node_modules/effect/dist/Formatter.js
function format(input, options) {
  const space = options?.space ?? 0;
  const seen = new WeakSet;
  const gap = !space ? "" : typeof space === "number" ? " ".repeat(space) : space;
  const ind = (d) => gap.repeat(d);
  const wrap = (v, body) => {
    const ctor = v?.constructor;
    return ctor && ctor !== Object.prototype.constructor && ctor.name ? `${ctor.name}(${body})` : body;
  };
  const ownKeys = (o) => {
    try {
      return Reflect.ownKeys(o);
    } catch {
      return ["[ownKeys threw]"];
    }
  };
  function recur(v, d = 0) {
    if (Array.isArray(v)) {
      if (seen.has(v))
        return CIRCULAR;
      seen.add(v);
      if (!gap || v.length <= 1)
        return `[${v.map((x) => recur(x, d)).join(",")}]`;
      const inner = v.map((x) => recur(x, d + 1)).join(`,
` + ind(d + 1));
      return `[
${ind(d + 1)}${inner}
${ind(d)}]`;
    }
    if (v instanceof Date)
      return formatDate(v);
    if (!options?.ignoreToString && hasProperty(v, "toString") && typeof v["toString"] === "function" && v["toString"] !== Object.prototype.toString && v["toString"] !== Array.prototype.toString) {
      const s = safeToString(v);
      if (v instanceof Error && v.cause) {
        return `${s} (cause: ${recur(v.cause, d)})`;
      }
      return s;
    }
    if (typeof v === "string")
      return JSON.stringify(v);
    if (typeof v === "number" || v == null || typeof v === "boolean" || typeof v === "symbol")
      return String(v);
    if (typeof v === "bigint")
      return String(v) + "n";
    if (typeof v === "object" || typeof v === "function") {
      if (seen.has(v))
        return CIRCULAR;
      seen.add(v);
      if (symbolRedactable in v)
        return format(getRedacted(v));
      if (Symbol.iterator in v) {
        return `${v.constructor.name}(${recur(Array.from(v), d)})`;
      }
      const keys = ownKeys(v);
      if (!gap || keys.length <= 1) {
        const body2 = `{${keys.map((k) => `${formatPropertyKey(k)}:${recur(v[k], d)}`).join(",")}}`;
        return wrap(v, body2);
      }
      const body = `{
${keys.map((k) => `${ind(d + 1)}${formatPropertyKey(k)}: ${recur(v[k], d + 1)}`).join(`,
`)}
${ind(d)}}`;
      return wrap(v, body);
    }
    return String(v);
  }
  return recur(input, 0);
}
var CIRCULAR = "[Circular]";
function formatPropertyKey(name) {
  return typeof name === "string" ? JSON.stringify(name) : String(name);
}
function formatPath(path) {
  return path.map((key) => `[${formatPropertyKey(key)}]`).join("");
}
function formatDate(date) {
  try {
    return date.toISOString();
  } catch {
    return "Invalid Date";
  }
}
function safeToString(input) {
  try {
    const s = input.toString();
    return typeof s === "string" ? s : String(s);
  } catch {
    return "[toString threw]";
  }
}
function formatJson(input, options) {
  const ancestors = [];
  return JSON.stringify(input, function(_key, value) {
    const redacted = redact(value);
    if (typeof redacted !== "object" || redacted === null) {
      return redacted;
    }
    while (ancestors.length > 0 && ancestors[ancestors.length - 1] !== this) {
      ancestors.pop();
    }
    if (ancestors.includes(redacted)) {
      return;
    }
    ancestors.push(redacted);
    return redacted;
  }, options?.space);
}

// node_modules/effect/dist/Inspectable.js
var NodeInspectSymbol = /* @__PURE__ */ Symbol.for("nodejs.util.inspect.custom");
var toJson = (input) => {
  try {
    if (hasProperty(input, "toJSON") && isFunction(input["toJSON"]) && input["toJSON"].length === 0) {
      return input.toJSON();
    } else if (Array.isArray(input)) {
      return input.map(toJson);
    }
  } catch {
    return "[toJSON threw]";
  }
  return redact(input);
};
var toStringUnknown = (u, whitespace = 2) => {
  if (typeof u === "string") {
    return u;
  }
  try {
    return typeof u === "object" ? formatJson(u, {
      space: whitespace
    }) : String(u);
  } catch {
    return String(u);
  }
};
var BaseProto = {
  toJSON() {
    return toJson(this);
  },
  [NodeInspectSymbol]() {
    return this.toJSON();
  },
  toString() {
    return format(this.toJSON());
  }
};

class Class2 {
  [NodeInspectSymbol]() {
    return this.toJSON();
  }
  toString() {
    return format(this.toJSON());
  }
}

// node_modules/effect/dist/Utils.js
class SingleShotGen {
  called = false;
  self;
  constructor(self) {
    this.self = self;
  }
  next(a) {
    return this.called ? {
      value: a,
      done: true
    } : (this.called = true, {
      value: this.self,
      done: false
    });
  }
  [Symbol.iterator]() {
    return new SingleShotGen(this.self);
  }
}
var InternalTypeId = "~effect/Utils/internal";
var standard = {
  [InternalTypeId]: (body) => {
    return body();
  }
};
var forced = {
  [InternalTypeId]: (body) => {
    try {
      return body();
    } finally {}
  }
};
var isNotOptimizedAway = /* @__PURE__ */ standard[InternalTypeId](() => new Error().stack)?.includes(InternalTypeId) === true;
var internalCall = isNotOptimizedAway ? standard[InternalTypeId] : forced[InternalTypeId];

// node_modules/effect/dist/internal/core.js
var EffectTypeId = `~effect/Effect`;
var ExitTypeId = `~effect/Exit`;
var effectVariance = {
  _A: identity,
  _E: identity,
  _R: identity
};
var identifier = `${EffectTypeId}/identifier`;
var args = `${EffectTypeId}/args`;
var evaluate = `${EffectTypeId}/evaluate`;
var contA = `${EffectTypeId}/successCont`;
var contE = `${EffectTypeId}/failureCont`;
var contAll = `${EffectTypeId}/ensureCont`;
var Yield = /* @__PURE__ */ Symbol.for("effect/Effect/Yield");
var PipeInspectableProto = {
  pipe() {
    return pipeArguments(this, arguments);
  },
  toJSON() {
    return {
      ...this
    };
  },
  toString() {
    return format(this.toJSON(), {
      ignoreToString: true,
      space: 2
    });
  },
  [NodeInspectSymbol]() {
    return this.toJSON();
  }
};
var StructuralProto = {
  [symbol]() {
    return structureKeys(this, Object.keys(this));
  },
  [symbol2](that) {
    const selfKeys = Object.keys(this);
    const thatKeys = Object.keys(that);
    if (selfKeys.length !== thatKeys.length)
      return false;
    for (let i = 0;i < selfKeys.length; i++) {
      if (selfKeys[i] !== thatKeys[i] && !equals(this[selfKeys[i]], that[selfKeys[i]])) {
        return false;
      }
    }
    return true;
  }
};
var EffectProto = {
  [EffectTypeId]: effectVariance,
  ...PipeInspectableProto,
  [Symbol.iterator]() {
    return new SingleShotGen(this);
  },
  toJSON() {
    return {
      _id: "Effect",
      op: this[identifier],
      ...args in this ? {
        args: this[args]
      } : undefined
    };
  }
};
var isEffect = (u) => hasProperty(u, EffectTypeId);
var isExit = (u) => hasProperty(u, ExitTypeId);
var CauseTypeId = "~effect/Cause";
var CauseReasonTypeId = "~effect/Cause/Reason";
var isCause = (self) => hasProperty(self, CauseTypeId);
class CauseImpl {
  [CauseTypeId];
  reasons;
  constructor(failures) {
    this[CauseTypeId] = CauseTypeId;
    this.reasons = failures;
  }
  pipe() {
    return pipeArguments(this, arguments);
  }
  toJSON() {
    return {
      _id: "Cause",
      failures: this.reasons.map((f) => f.toJSON())
    };
  }
  toString() {
    return `Cause(${format(this.reasons)})`;
  }
  [NodeInspectSymbol]() {
    return this.toJSON();
  }
  [symbol2](that) {
    return isCause(that) && this.reasons.length === that.reasons.length && this.reasons.every((e, i) => equals(e, that.reasons[i]));
  }
  [symbol]() {
    return array(this.reasons);
  }
}
var annotationsMap = /* @__PURE__ */ new WeakMap;

class ReasonBase {
  [CauseReasonTypeId];
  annotations;
  _tag;
  constructor(_tag, annotations, originalError) {
    this[CauseReasonTypeId] = CauseReasonTypeId;
    this._tag = _tag;
    if (annotations !== constEmptyAnnotations && typeof originalError === "object" && originalError !== null && annotations.size > 0) {
      const prevAnnotations = annotationsMap.get(originalError);
      if (prevAnnotations) {
        annotations = new Map([...prevAnnotations, ...annotations]);
      }
      annotationsMap.set(originalError, annotations);
    }
    this.annotations = annotations;
  }
  annotate(annotations, options) {
    if (annotations.mapUnsafe.size === 0)
      return this;
    const newAnnotations = new Map(this.annotations);
    annotations.mapUnsafe.forEach((value, key) => {
      if (options?.overwrite !== true && newAnnotations.has(key))
        return;
      newAnnotations.set(key, value);
    });
    const self = Object.assign(Object.create(Object.getPrototypeOf(this)), this);
    self.annotations = newAnnotations;
    return self;
  }
  pipe() {
    return pipeArguments(this, arguments);
  }
  toString() {
    return format(this);
  }
  [NodeInspectSymbol]() {
    return this.toString();
  }
}
var constEmptyAnnotations = /* @__PURE__ */ new Map;

class Fail extends ReasonBase {
  error;
  constructor(error, annotations = constEmptyAnnotations) {
    super("Fail", annotations, error);
    this.error = error;
  }
  toString() {
    return `Fail(${format(this.error)})`;
  }
  toJSON() {
    return {
      _tag: "Fail",
      error: this.error
    };
  }
  [symbol2](that) {
    return isFailReason(that) && equals(this.error, that.error) && equals(this.annotations, that.annotations);
  }
  [symbol]() {
    return combine(string(this._tag))(combine(hash(this.error))(hash(this.annotations)));
  }
}
var causeFromReasons = (reasons) => new CauseImpl(reasons);
var causeEmpty = /* @__PURE__ */ new CauseImpl([]);
var causeFail = (error) => new CauseImpl([new Fail(error)]);

class Die extends ReasonBase {
  defect;
  constructor(defect, annotations = constEmptyAnnotations) {
    super("Die", annotations, defect);
    this.defect = defect;
  }
  toString() {
    return `Die(${format(this.defect)})`;
  }
  toJSON() {
    return {
      _tag: "Die",
      defect: this.defect
    };
  }
  [symbol2](that) {
    return isDieReason(that) && equals(this.defect, that.defect) && equals(this.annotations, that.annotations);
  }
  [symbol]() {
    return combine(string(this._tag))(combine(hash(this.defect))(hash(this.annotations)));
  }
}
var causeDie = (defect) => new CauseImpl([new Die(defect)]);
var causeAnnotate = /* @__PURE__ */ dual((args2) => isCause(args2[0]), (self, annotations, options) => {
  if (annotations.mapUnsafe.size === 0)
    return self;
  return new CauseImpl(self.reasons.map((f) => f.annotate(annotations, options)));
});
var isFailReason = (self) => self._tag === "Fail";
var isDieReason = (self) => self._tag === "Die";
var isInterruptReason = (self) => self._tag === "Interrupt";
function defaultEvaluate(_fiber) {
  return exitDie(`Effect.evaluate: Not implemented`);
}
var makePrimitiveProto = (options) => ({
  ...EffectProto,
  [identifier]: options.op,
  [evaluate]: options[evaluate] ?? defaultEvaluate,
  [contA]: options[contA],
  [contE]: options[contE],
  [contAll]: options[contAll]
});
var makePrimitive = (options) => {
  const Proto = makePrimitiveProto(options);
  return function() {
    const self = Object.create(Proto);
    self[args] = options.single === false ? arguments : arguments[0];
    return self;
  };
};
var makeExit = (options) => {
  const Proto = {
    ...makePrimitiveProto(options),
    [ExitTypeId]: ExitTypeId,
    _tag: options.op,
    get [options.prop]() {
      return this[args];
    },
    toString() {
      return `${options.op}(${format(this[args])})`;
    },
    toJSON() {
      return {
        _id: "Exit",
        _tag: options.op,
        [options.prop]: this[args]
      };
    },
    [symbol2](that) {
      return isExit(that) && that._tag === this._tag && equals(this[args], that[args]);
    },
    [symbol]() {
      return combine(string(options.op), hash(this[args]));
    }
  };
  return function(value) {
    const self = Object.create(Proto);
    self[args] = value;
    return self;
  };
};
var exitSucceed = /* @__PURE__ */ makeExit({
  op: "Success",
  prop: "value",
  [evaluate](fiber) {
    const cont = fiber.getCont(contA);
    return cont ? cont[contA](this[args], fiber, this) : fiber.yieldWith(this);
  }
});
var StackTraceKey = {
  key: "effect/Cause/StackTrace"
};
var InterruptorStackTrace = {
  key: "effect/Cause/InterruptorStackTrace"
};
var exitFailCause = /* @__PURE__ */ makeExit({
  op: "Failure",
  prop: "cause",
  [evaluate](fiber) {
    let cause = this[args];
    let annotated = false;
    if (fiber.currentStackFrame) {
      cause = causeAnnotate(cause, {
        mapUnsafe: new Map([[StackTraceKey.key, fiber.currentStackFrame]])
      });
      annotated = true;
    }
    let cont = fiber.getCont(contE);
    while (fiber.interruptible && fiber._interruptedCause && cont) {
      cont = fiber.getCont(contE);
    }
    return cont ? cont[contE](cause, fiber, annotated ? undefined : this) : fiber.yieldWith(annotated ? this : exitFailCause(cause));
  }
});
var exitFail = (e) => exitFailCause(causeFail(e));
var exitDie = (defect) => exitFailCause(causeDie(defect));
var withFiber = /* @__PURE__ */ makePrimitive({
  op: "WithFiber",
  [evaluate](fiber) {
    return this[args](fiber);
  }
});
var YieldableError = /* @__PURE__ */ function() {

  class YieldableError2 extends globalThis.Error {
  }
  const proto = /* @__PURE__ */ makePrimitiveProto({
    op: "YieldableError",
    [evaluate]() {
      return exitFail(this);
    }
  });
  delete proto.toString;
  Object.assign(YieldableError2.prototype, proto);
  return YieldableError2;
}();
var Error2 = /* @__PURE__ */ function() {
  const plainArgsSymbol = /* @__PURE__ */ Symbol.for("effect/Data/Error/plainArgs");
  return class Base extends YieldableError {
    constructor(args2) {
      super(args2?.message, args2?.cause ? {
        cause: args2.cause
      } : undefined);
      if (args2) {
        Object.assign(this, args2);
        Object.defineProperty(this, plainArgsSymbol, {
          value: args2,
          enumerable: false
        });
      }
    }
    toJSON() {
      return {
        ...this[plainArgsSymbol],
        ...this
      };
    }
  };
}();
var TaggedError = (tag) => {

  class Base extends Error2 {
    _tag = tag;
  }
  Base.prototype.name = tag;
  return Base;
};
var NoSuchElementErrorTypeId = "~effect/Cause/NoSuchElementError";
var isNoSuchElementError = (u) => hasProperty(u, NoSuchElementErrorTypeId);

class NoSuchElementError extends (/* @__PURE__ */ TaggedError("NoSuchElementError")) {
  [NoSuchElementErrorTypeId] = NoSuchElementErrorTypeId;
  constructor(message) {
    super({
      message
    });
  }
}
var DoneTypeId = "~effect/Cause/Done";
var isDone = (u) => hasProperty(u, DoneTypeId);
var DoneVoid = {
  [DoneTypeId]: DoneTypeId,
  _tag: "Done",
  value: undefined
};
var Done = (value) => {
  if (value === undefined)
    return DoneVoid;
  return {
    [DoneTypeId]: DoneTypeId,
    _tag: "Done",
    value
  };
};
var doneVoid = /* @__PURE__ */ exitFail(DoneVoid);
var done = (value) => {
  if (value === undefined)
    return doneVoid;
  return exitFail(Done(value));
};

// node_modules/effect/dist/Data.js
var Class3 = class extends Class {
  constructor(props) {
    super();
    if (props) {
      Object.assign(this, props);
    }
  }
};
var TaggedClass = (tag) => class extends Class3 {
  _tag = tag;
};
var taggedEnum = () => new Proxy({}, {
  get(_target, tag, _receiver) {
    if (tag === "$is") {
      return isTagged;
    } else if (tag === "$match") {
      return taggedMatch;
    }
    return (props) => ({
      ...props,
      _tag: tag
    });
  }
});
function taggedMatch() {
  if (arguments.length === 1) {
    const cases2 = arguments[0];
    return function(value2) {
      return cases2[value2._tag](value2);
    };
  }
  const value = arguments[0];
  const cases = arguments[1];
  return cases[value._tag](value);
}
var Error3 = Error2;
var TaggedError2 = TaggedError;
// node_modules/effect/dist/Duration.js
var exports_Duration = {};
__export(exports_Duration, {
  zero: () => zero,
  weeks: () => weeks,
  toWeeks: () => toWeeks,
  toSeconds: () => toSeconds,
  toNanosUnsafe: () => toNanosUnsafe,
  toNanos: () => toNanos,
  toMinutes: () => toMinutes,
  toMillis: () => toMillis,
  toHrTime: () => toHrTime,
  toHours: () => toHours,
  toDays: () => toDays,
  times: () => times,
  sum: () => sum,
  subtract: () => subtract,
  seconds: () => seconds,
  parts: () => parts,
  negativeInfinity: () => negativeInfinity,
  negate: () => negate,
  nanos: () => nanos,
  minutes: () => minutes,
  min: () => min3,
  millis: () => millis,
  micros: () => micros,
  max: () => max3,
  matchPair: () => matchPair,
  match: () => match2,
  isZero: () => isZero,
  isPositive: () => isPositive,
  isNegative: () => isNegative,
  isLessThanOrEqualTo: () => isLessThanOrEqualTo2,
  isLessThan: () => isLessThan2,
  isGreaterThanOrEqualTo: () => isGreaterThanOrEqualTo2,
  isGreaterThan: () => isGreaterThan2,
  isFinite: () => isFinite,
  isDuration: () => isDuration,
  infinity: () => infinity,
  hours: () => hours,
  fromInputUnsafe: () => fromInputUnsafe,
  fromInput: () => fromInput,
  format: () => format2,
  equals: () => equals2,
  divideUnsafe: () => divideUnsafe,
  divide: () => divide,
  days: () => days,
  clamp: () => clamp2,
  between: () => between,
  abs: () => abs,
  ReducerSum: () => ReducerSum,
  Order: () => Order,
  Equivalence: () => Equivalence,
  CombinerMin: () => CombinerMin,
  CombinerMax: () => CombinerMax
});

// node_modules/effect/dist/Combiner.js
function make(combine2) {
  return {
    combine: combine2
  };
}
function min(order) {
  return make((self, that) => order(self, that) === -1 ? self : that);
}
function max(order) {
  return make((self, that) => order(self, that) === 1 ? self : that);
}

// node_modules/effect/dist/Reducer.js
function make2(combine2, initialValue, combineAll) {
  return {
    combine: combine2,
    initialValue,
    combineAll: combineAll ?? ((collection) => {
      let out = initialValue;
      for (const value of collection) {
        out = combine2(out, value);
      }
      return out;
    })
  };
}

// node_modules/effect/dist/Equivalence.js
var make3 = (isEquivalent) => (self, that) => self === that || isEquivalent(self, that);
var isStrictEquivalent = (x, y) => x === y;
var strictEqual = () => isStrictEquivalent;
function Tuple(elements) {
  return make3((self, that) => {
    if (self.length !== that.length) {
      return false;
    }
    for (let i = 0;i < self.length; i++) {
      if (!elements[i](self[i], that[i])) {
        return false;
      }
    }
    return true;
  });
}
function Array_(item) {
  return make3((self, that) => {
    if (self.length !== that.length)
      return false;
    for (let i = 0;i < self.length; i++) {
      if (!item(self[i], that[i]))
        return false;
    }
    return true;
  });
}

// node_modules/effect/dist/internal/doNotation.js
var let_ = (map) => dual(3, (self, name, f) => map(self, (a) => ({
  ...a,
  [name]: f(a)
})));
var bindTo = (map) => dual(2, (self, name) => map(self, (a) => ({
  [name]: a
})));
var bind = (map, flatMap) => dual(3, (self, name, f) => flatMap(self, (a) => map(f(a), (b) => ({
  ...a,
  [name]: b
}))));

// node_modules/effect/dist/internal/option.js
var TypeId = "~effect/data/Option";
var CommonProto = {
  [TypeId]: {
    _A: (_) => _
  },
  ...PipeInspectableProto,
  [Symbol.iterator]() {
    return new SingleShotGen(this);
  }
};
var SomeProto = /* @__PURE__ */ Object.assign(/* @__PURE__ */ Object.create(CommonProto), {
  _tag: "Some",
  _op: "Some",
  [symbol2](that) {
    return isOption(that) && isSome(that) && equals(this.value, that.value);
  },
  [symbol]() {
    return combine(hash(this._tag))(hash(this.value));
  },
  toString() {
    return `some(${format(this.value)})`;
  },
  toJSON() {
    return {
      _id: "Option",
      _tag: this._tag,
      value: toJson(this.value)
    };
  }
});
Object.defineProperty(SomeProto, "valueOrUndefined", {
  get() {
    return this.value;
  }
});
var NoneHash = /* @__PURE__ */ hash("None");
var NoneProto = /* @__PURE__ */ Object.assign(/* @__PURE__ */ Object.create(CommonProto), {
  _tag: "None",
  _op: "None",
  valueOrUndefined: undefined,
  [symbol2](that) {
    return isOption(that) && isNone(that);
  },
  [symbol]() {
    return NoneHash;
  },
  toString() {
    return `none()`;
  },
  toJSON() {
    return {
      _id: "Option",
      _tag: this._tag
    };
  }
});
var isOption = (input) => hasProperty(input, TypeId);
var isNone = (fa) => fa._tag === "None";
var isSome = (fa) => fa._tag === "Some";
var none = /* @__PURE__ */ Object.create(NoneProto);
var some = (value) => {
  const a = Object.create(SomeProto);
  a.value = value;
  return a;
};

// node_modules/effect/dist/internal/result.js
var TypeId2 = "~effect/data/Result";
var CommonProto2 = {
  [TypeId2]: {
    _A: (_) => _,
    _E: (_) => _
  },
  ...PipeInspectableProto,
  [Symbol.iterator]() {
    return new SingleShotGen(this);
  }
};
var SuccessProto = /* @__PURE__ */ Object.assign(/* @__PURE__ */ Object.create(CommonProto2), {
  _tag: "Success",
  _op: "Success",
  [symbol2](that) {
    return isResult(that) && isSuccess(that) && equals(this.success, that.success);
  },
  [symbol]() {
    return combine(hash(this._tag))(hash(this.success));
  },
  toString() {
    return `success(${format(this.success)})`;
  },
  toJSON() {
    return {
      _id: "Result",
      _tag: this._tag,
      value: toJson(this.success)
    };
  }
});
var FailureProto = /* @__PURE__ */ Object.assign(/* @__PURE__ */ Object.create(CommonProto2), {
  _tag: "Failure",
  _op: "Failure",
  [symbol2](that) {
    return isResult(that) && isFailure(that) && equals(this.failure, that.failure);
  },
  [symbol]() {
    return combine(hash(this._tag))(hash(this.failure));
  },
  toString() {
    return `failure(${format(this.failure)})`;
  },
  toJSON() {
    return {
      _id: "Result",
      _tag: this._tag,
      failure: toJson(this.failure)
    };
  }
});
var isResult = (input) => hasProperty(input, TypeId2);
var isFailure = (result) => result._tag === "Failure";
var isSuccess = (result) => result._tag === "Success";
var fail = (failure) => {
  const a = Object.create(FailureProto);
  a.failure = failure;
  return a;
};
var succeed = (success) => {
  const a = Object.create(SuccessProto);
  a.success = success;
  return a;
};

// node_modules/effect/dist/Order.js
function make4(compare) {
  return (self, that) => self === that ? 0 : compare(self, that);
}
var Number2 = /* @__PURE__ */ make4((self, that) => {
  if (globalThis.Number.isNaN(self) && globalThis.Number.isNaN(that))
    return 0;
  if (globalThis.Number.isNaN(self))
    return -1;
  if (globalThis.Number.isNaN(that))
    return 1;
  return self < that ? -1 : 1;
});
var mapInput = /* @__PURE__ */ dual(2, (self, f) => make4((b1, b2) => self(f(b1), f(b2))));
var isLessThan = (O) => dual(2, (self, that) => O(self, that) === -1);
var isGreaterThan = (O) => dual(2, (self, that) => O(self, that) === 1);
var isLessThanOrEqualTo = (O) => dual(2, (self, that) => O(self, that) !== 1);
var isGreaterThanOrEqualTo = (O) => dual(2, (self, that) => O(self, that) !== -1);
var min2 = (O) => dual(2, (self, that) => self === that || O(self, that) < 1 ? self : that);
var max2 = (O) => dual(2, (self, that) => self === that || O(self, that) > -1 ? self : that);
var clamp = (O) => dual(2, (self, options) => min2(O)(options.maximum, max2(O)(options.minimum, self)));
var isBetween = (O) => dual(2, (self, options) => !isLessThan(O)(self, options.minimum) && !isGreaterThan(O)(self, options.maximum));

// node_modules/effect/dist/Option.js
var none2 = () => none;
var some2 = some;
var isNone2 = isNone;
var isSome2 = isSome;
var match = /* @__PURE__ */ dual(2, (self, {
  onNone,
  onSome
}) => isNone2(self) ? onNone() : onSome(self.value));
var getOrElse = /* @__PURE__ */ dual(2, (self, onNone) => isNone2(self) ? onNone() : self.value);
var fromNullishOr = (a) => a == null ? none2() : some2(a);
var getOrUndefined = /* @__PURE__ */ getOrElse(constUndefined);
var liftThrowable = (f) => (...a) => {
  try {
    return some2(f(...a));
  } catch {
    return none2();
  }
};
var map = /* @__PURE__ */ dual(2, (self, f) => isNone2(self) ? none2() : some2(f(self.value)));
var filter = /* @__PURE__ */ dual(2, (self, predicate) => isNone2(self) ? none2() : predicate(self.value) ? some2(self.value) : none2());

// node_modules/effect/dist/Duration.js
var TypeId3 = "~effect/time/Duration";
var bigint0 = /* @__PURE__ */ BigInt(0);
var bigint24 = /* @__PURE__ */ BigInt(24);
var bigint60 = /* @__PURE__ */ BigInt(60);
var bigint1e3 = /* @__PURE__ */ BigInt(1000);
var bigint1e6 = /* @__PURE__ */ BigInt(1e6);
var bigint1e9 = /* @__PURE__ */ BigInt(1e9);
var DURATION_REGEXP = /^(-?\d+(?:\.\d+)?)\s+(nanos?|micros?|millis?|seconds?|minutes?|hours?|days?|weeks?)$/;
var fromInputUnsafe = (input) => {
  switch (typeof input) {
    case "number":
      return millis(input);
    case "bigint":
      return nanos(input);
    case "string": {
      if (input === "Infinity") {
        return infinity;
      }
      if (input === "-Infinity") {
        return negativeInfinity;
      }
      const match2 = DURATION_REGEXP.exec(input);
      if (!match2)
        break;
      const [_, valueStr, unit] = match2;
      const value = Number(valueStr);
      switch (unit) {
        case "nano":
        case "nanos":
          return nanos(BigInt(valueStr));
        case "micro":
        case "micros":
          return micros(BigInt(valueStr));
        case "milli":
        case "millis":
          return millis(value);
        case "second":
        case "seconds":
          return seconds(value);
        case "minute":
        case "minutes":
          return minutes(value);
        case "hour":
        case "hours":
          return hours(value);
        case "day":
        case "days":
          return days(value);
        case "week":
        case "weeks":
          return weeks(value);
      }
      break;
    }
    case "object": {
      if (input === null)
        break;
      if (TypeId3 in input)
        return input;
      if (Array.isArray(input)) {
        if (input.length !== 2 || !input.every(isNumber)) {
          return invalid(input);
        }
        if (Number.isNaN(input[0]) || Number.isNaN(input[1])) {
          return zero;
        }
        if (input[0] === -Infinity || input[1] === -Infinity) {
          return negativeInfinity;
        }
        if (input[0] === Infinity || input[1] === Infinity) {
          return infinity;
        }
        return make5(BigInt(Math.round(input[0] * 1e9)) + BigInt(Math.round(input[1])));
      }
      const obj = input;
      let millis = 0;
      if (obj.weeks)
        millis += obj.weeks * 604800000;
      if (obj.days)
        millis += obj.days * 86400000;
      if (obj.hours)
        millis += obj.hours * 3600000;
      if (obj.minutes)
        millis += obj.minutes * 60000;
      if (obj.seconds)
        millis += obj.seconds * 1000;
      if (obj.milliseconds)
        millis += obj.milliseconds;
      if (!obj.microseconds && !obj.nanoseconds)
        return make5(millis);
      let nanos = BigInt(millis) * bigint1e6;
      if (obj.microseconds)
        nanos += BigInt(obj.microseconds) * bigint1e3;
      if (obj.nanoseconds)
        nanos += BigInt(obj.nanoseconds);
      return make5(nanos);
    }
  }
  return invalid(input);
};
var invalid = (input) => {
  throw new Error(`Invalid Input: ${input}`);
};
var fromInput = /* @__PURE__ */ liftThrowable(fromInputUnsafe);
var zeroDurationValue = {
  _tag: "Millis",
  millis: 0
};
var infinityDurationValue = {
  _tag: "Infinity"
};
var negativeInfinityDurationValue = {
  _tag: "NegativeInfinity"
};
var DurationProto = {
  [TypeId3]: TypeId3,
  [symbol]() {
    return structure(this.value);
  },
  [symbol2](that) {
    return isDuration(that) && equals2(this, that);
  },
  toString() {
    switch (this.value._tag) {
      case "Infinity":
        return "Infinity";
      case "NegativeInfinity":
        return "-Infinity";
      case "Nanos":
        return `${this.value.nanos} nanos`;
      case "Millis":
        return `${this.value.millis} millis`;
    }
  },
  toJSON() {
    switch (this.value._tag) {
      case "Millis":
        return {
          _id: "Duration",
          _tag: "Millis",
          millis: this.value.millis
        };
      case "Nanos":
        return {
          _id: "Duration",
          _tag: "Nanos",
          nanos: String(this.value.nanos)
        };
      case "Infinity":
        return {
          _id: "Duration",
          _tag: "Infinity"
        };
      case "NegativeInfinity":
        return {
          _id: "Duration",
          _tag: "NegativeInfinity"
        };
    }
  },
  [NodeInspectSymbol]() {
    return this.toJSON();
  },
  pipe() {
    return pipeArguments(this, arguments);
  }
};
var make5 = (input) => {
  const duration = Object.create(DurationProto);
  if (typeof input === "number") {
    if (isNaN(input) || input === 0 || Object.is(input, -0)) {
      duration.value = zeroDurationValue;
    } else if (!Number.isFinite(input)) {
      duration.value = input > 0 ? infinityDurationValue : negativeInfinityDurationValue;
    } else if (!Number.isInteger(input)) {
      duration.value = {
        _tag: "Nanos",
        nanos: BigInt(Math.round(input * 1e6))
      };
    } else {
      duration.value = {
        _tag: "Millis",
        millis: input
      };
    }
  } else if (input === bigint0) {
    duration.value = zeroDurationValue;
  } else {
    duration.value = {
      _tag: "Nanos",
      nanos: input
    };
  }
  return duration;
};
var isDuration = (u) => hasProperty(u, TypeId3);
var isFinite = (self) => self.value._tag !== "Infinity" && self.value._tag !== "NegativeInfinity";
var isZero = (self) => {
  switch (self.value._tag) {
    case "Millis":
      return self.value.millis === 0;
    case "Nanos":
      return self.value.nanos === bigint0;
    case "Infinity":
    case "NegativeInfinity":
      return false;
  }
};
var isNegative = (self) => {
  switch (self.value._tag) {
    case "Millis":
      return self.value.millis < 0;
    case "Nanos":
      return self.value.nanos < bigint0;
    case "NegativeInfinity":
      return true;
    case "Infinity":
      return false;
  }
};
var isPositive = (self) => {
  switch (self.value._tag) {
    case "Millis":
      return self.value.millis > 0;
    case "Nanos":
      return self.value.nanos > bigint0;
    case "Infinity":
      return true;
    case "NegativeInfinity":
      return false;
  }
};
var abs = (self) => {
  switch (self.value._tag) {
    case "Infinity":
    case "NegativeInfinity":
      return infinity;
    case "Millis":
      return self.value.millis < 0 ? make5(-self.value.millis) : self;
    case "Nanos":
      return self.value.nanos < bigint0 ? make5(-self.value.nanos) : self;
  }
};
var negate = (self) => {
  switch (self.value._tag) {
    case "Infinity":
      return negativeInfinity;
    case "NegativeInfinity":
      return infinity;
    case "Millis":
      return self.value.millis === 0 ? self : make5(-self.value.millis);
    case "Nanos":
      return self.value.nanos === bigint0 ? self : make5(-self.value.nanos);
  }
};
var zero = /* @__PURE__ */ make5(0);
var infinity = /* @__PURE__ */ make5(Infinity);
var negativeInfinity = /* @__PURE__ */ make5(-Infinity);
var nanos = (nanos2) => make5(nanos2);
var micros = (micros2) => make5(micros2 * bigint1e3);
var millis = (millis2) => make5(millis2);
var seconds = (seconds2) => make5(seconds2 * 1000);
var minutes = (minutes2) => make5(minutes2 * 60000);
var hours = (hours2) => make5(hours2 * 3600000);
var days = (days2) => make5(days2 * 86400000);
var weeks = (weeks2) => make5(weeks2 * 604800000);
var toMillis = (self) => match2(fromInputUnsafe(self), {
  onMillis: identity,
  onNanos: (nanos2) => Number(nanos2) / 1e6,
  onInfinity: () => Infinity,
  onNegativeInfinity: () => -Infinity
});
var toSeconds = (self) => match2(fromInputUnsafe(self), {
  onMillis: (millis2) => millis2 / 1000,
  onNanos: (nanos2) => Number(nanos2) / 1e9,
  onInfinity: () => Infinity,
  onNegativeInfinity: () => -Infinity
});
var toMinutes = (self) => match2(fromInputUnsafe(self), {
  onMillis: (millis2) => millis2 / 60000,
  onNanos: (nanos2) => Number(nanos2) / 60000000000,
  onInfinity: () => Infinity,
  onNegativeInfinity: () => -Infinity
});
var toHours = (self) => match2(fromInputUnsafe(self), {
  onMillis: (millis2) => millis2 / 3600000,
  onNanos: (nanos2) => Number(nanos2) / 3600000000000,
  onInfinity: () => Infinity,
  onNegativeInfinity: () => -Infinity
});
var toDays = (self) => match2(fromInputUnsafe(self), {
  onMillis: (millis2) => millis2 / 86400000,
  onNanos: (nanos2) => Number(nanos2) / 86400000000000,
  onInfinity: () => Infinity,
  onNegativeInfinity: () => -Infinity
});
var toWeeks = (self) => match2(fromInputUnsafe(self), {
  onMillis: (millis2) => millis2 / 604800000,
  onNanos: (nanos2) => Number(nanos2) / 604800000000000,
  onInfinity: () => Infinity,
  onNegativeInfinity: () => -Infinity
});
var toNanosUnsafe = (input) => {
  const self = fromInputUnsafe(input);
  switch (self.value._tag) {
    case "Infinity":
    case "NegativeInfinity":
      throw new Error("Cannot convert infinite duration to nanos");
    case "Nanos":
      return self.value.nanos;
    case "Millis":
      return BigInt(Math.round(self.value.millis * 1e6));
  }
};
var toNanos = /* @__PURE__ */ liftThrowable(toNanosUnsafe);
var toHrTime = (input) => {
  const self = fromInputUnsafe(input);
  switch (self.value._tag) {
    case "Infinity":
      return [Infinity, 0];
    case "NegativeInfinity":
      return [-Infinity, 0];
    case "Nanos": {
      const n = self.value.nanos;
      const sign = n < bigint0 ? -BigInt(1) : BigInt(1);
      const a = n < bigint0 ? -n : n;
      return [Number(sign * (a / bigint1e9)), Number(sign * (a % bigint1e9))];
    }
    case "Millis": {
      const m = self.value.millis;
      const sign = m < 0 ? -1 : 1;
      const a = Math.abs(m);
      return [sign * Math.floor(a / 1000), sign * Math.round(a % 1000 * 1e6)];
    }
  }
};
var match2 = /* @__PURE__ */ dual(2, (self, options) => {
  switch (self.value._tag) {
    case "Millis":
      return options.onMillis(self.value.millis);
    case "Nanos":
      return options.onNanos(self.value.nanos);
    case "Infinity":
      return options.onInfinity();
    case "NegativeInfinity":
      return (options.onNegativeInfinity ?? options.onInfinity)();
  }
});
var matchPair = /* @__PURE__ */ dual(3, (self, that, options) => {
  if (self.value._tag === "Infinity" || self.value._tag === "NegativeInfinity" || that.value._tag === "Infinity" || that.value._tag === "NegativeInfinity")
    return options.onInfinity(self, that);
  if (self.value._tag === "Millis") {
    return that.value._tag === "Millis" ? options.onMillis(self.value.millis, that.value.millis) : options.onNanos(toNanosUnsafe(self), that.value.nanos);
  } else {
    return options.onNanos(self.value.nanos, toNanosUnsafe(that));
  }
});
var Order = /* @__PURE__ */ make4((self, that) => matchPair(self, that, {
  onMillis: (self2, that2) => self2 < that2 ? -1 : self2 > that2 ? 1 : 0,
  onNanos: (self2, that2) => self2 < that2 ? -1 : self2 > that2 ? 1 : 0,
  onInfinity: (self2, that2) => {
    if (self2.value._tag === that2.value._tag)
      return 0;
    if (self2.value._tag === "Infinity")
      return 1;
    if (self2.value._tag === "NegativeInfinity")
      return -1;
    if (that2.value._tag === "Infinity")
      return -1;
    return 1;
  }
}));
var between = /* @__PURE__ */ isBetween(Order);
var Equivalence = (self, that) => matchPair(self, that, {
  onMillis: (self2, that2) => self2 === that2,
  onNanos: (self2, that2) => self2 === that2,
  onInfinity: (self2, that2) => self2.value._tag === that2.value._tag
});
var min3 = /* @__PURE__ */ min2(Order);
var max3 = /* @__PURE__ */ max2(Order);
var clamp2 = /* @__PURE__ */ clamp(Order);
var divide = /* @__PURE__ */ dual(2, (self, by) => {
  if (!Number.isFinite(by))
    return none2();
  if (by === 0 || Object.is(by, -0))
    return none2();
  return match2(self, {
    onMillis: (millis2) => some2(make5(millis2 / by)),
    onNanos: (nanos2) => {
      try {
        return some2(make5(nanos2 / BigInt(by)));
      } catch {
        return none2();
      }
    },
    onInfinity: () => some2(by > 0 ? infinity : negativeInfinity),
    onNegativeInfinity: () => some2(by > 0 ? negativeInfinity : infinity)
  });
});
var divideUnsafe = /* @__PURE__ */ dual(2, (self, by) => {
  if (!Number.isFinite(by))
    return zero;
  return match2(self, {
    onMillis: (millis2) => make5(millis2 / by),
    onNanos: (nanos2) => {
      if (Object.is(by, 0) || Object.is(by, -0)) {
        if (nanos2 === bigint0)
          return zero;
        const positiveNanos = nanos2 > bigint0;
        const positiveZero = Object.is(by, 0);
        return positiveNanos === positiveZero ? infinity : negativeInfinity;
      }
      try {
        return make5(nanos2 / BigInt(by));
      } catch {
        return zero;
      }
    },
    onInfinity: () => by > 0 ? infinity : by < 0 ? negativeInfinity : zero,
    onNegativeInfinity: () => by > 0 ? negativeInfinity : by < 0 ? infinity : zero
  });
});
var times = /* @__PURE__ */ dual(2, (self, times2) => match2(self, {
  onMillis: (millis2) => make5(millis2 * times2),
  onNanos: (nanos2) => make5(nanos2 * BigInt(times2)),
  onInfinity: () => times2 > 0 ? infinity : times2 < 0 ? negativeInfinity : zero,
  onNegativeInfinity: () => times2 > 0 ? negativeInfinity : times2 < 0 ? infinity : zero
}));
var subtract = /* @__PURE__ */ dual(2, (self, that) => matchPair(self, that, {
  onMillis: (self2, that2) => make5(self2 - that2),
  onNanos: (self2, that2) => make5(self2 - that2),
  onInfinity: (self2, that2) => {
    const s = self2.value._tag;
    const t = that2.value._tag;
    if (s === "Infinity")
      return t === "Infinity" ? zero : infinity;
    if (s === "NegativeInfinity")
      return t === "NegativeInfinity" ? zero : negativeInfinity;
    return t === "Infinity" ? negativeInfinity : infinity;
  }
}));
var sum = /* @__PURE__ */ dual(2, (self, that) => matchPair(self, that, {
  onMillis: (self2, that2) => make5(self2 + that2),
  onNanos: (self2, that2) => make5(self2 + that2),
  onInfinity: (self2, that2) => {
    const s = self2.value._tag;
    const t = that2.value._tag;
    if (s === "Infinity" && t === "NegativeInfinity")
      return zero;
    if (s === "NegativeInfinity" && t === "Infinity")
      return zero;
    if (s === "Infinity" || t === "Infinity")
      return infinity;
    if (s === "NegativeInfinity" || t === "NegativeInfinity")
      return negativeInfinity;
    return zero;
  }
}));
var isLessThan2 = /* @__PURE__ */ isLessThan(Order);
var isLessThanOrEqualTo2 = /* @__PURE__ */ isLessThanOrEqualTo(Order);
var isGreaterThan2 = /* @__PURE__ */ isGreaterThan(Order);
var isGreaterThanOrEqualTo2 = /* @__PURE__ */ isGreaterThanOrEqualTo(Order);
var equals2 = /* @__PURE__ */ dual(2, (self, that) => Equivalence(self, that));
var parts = (self) => {
  if (self.value._tag === "Infinity") {
    return {
      days: Infinity,
      hours: Infinity,
      minutes: Infinity,
      seconds: Infinity,
      millis: Infinity,
      nanos: Infinity
    };
  }
  if (self.value._tag === "NegativeInfinity") {
    return {
      days: -Infinity,
      hours: -Infinity,
      minutes: -Infinity,
      seconds: -Infinity,
      millis: -Infinity,
      nanos: -Infinity
    };
  }
  const n = toNanosUnsafe(self);
  const neg = n < bigint0;
  const a = neg ? -n : n;
  const ms = a / bigint1e6;
  const sec = ms / bigint1e3;
  const min4 = sec / bigint60;
  const hr = min4 / bigint60;
  const d = hr / bigint24;
  const sign = neg ? -1 : 1;
  return {
    days: sign * Number(d),
    hours: sign * Number(hr % bigint24),
    minutes: sign * Number(min4 % bigint60),
    seconds: sign * Number(sec % bigint60),
    millis: sign * Number(ms % bigint1e3),
    nanos: sign * Number(a % bigint1e6)
  };
};
var format2 = (self) => {
  if (self.value._tag === "Infinity") {
    return "Infinity";
  }
  if (self.value._tag === "NegativeInfinity") {
    return "-Infinity";
  }
  if (isZero(self)) {
    return "0";
  }
  if (isNegative(self)) {
    return "-" + format2(abs(self));
  }
  const fragments = parts(self);
  const pieces = [];
  if (fragments.days !== 0) {
    pieces.push(`${fragments.days}d`);
  }
  if (fragments.hours !== 0) {
    pieces.push(`${fragments.hours}h`);
  }
  if (fragments.minutes !== 0) {
    pieces.push(`${fragments.minutes}m`);
  }
  if (fragments.seconds !== 0) {
    pieces.push(`${fragments.seconds}s`);
  }
  if (fragments.millis !== 0) {
    pieces.push(`${fragments.millis}ms`);
  }
  if (fragments.nanos !== 0) {
    pieces.push(`${fragments.nanos}ns`);
  }
  return pieces.join(" ");
};
var ReducerSum = /* @__PURE__ */ make2(sum, zero);
var CombinerMax = /* @__PURE__ */ max(Order);
var CombinerMin = /* @__PURE__ */ min(Order);
// node_modules/effect/dist/Effect.js
var exports_Effect = {};
__export(exports_Effect, {
  zipWith: () => zipWith2,
  zip: () => zip2,
  yieldNowWith: () => yieldNowWith2,
  yieldNow: () => yieldNow2,
  withTracerTiming: () => withTracerTiming2,
  withTracerEnabled: () => withTracerEnabled2,
  withTracer: () => withTracer2,
  withSpanScoped: () => withSpanScoped2,
  withSpan: () => withSpan2,
  withParentSpan: () => withParentSpan2,
  withLogger: () => withLogger,
  withLogSpan: () => withLogSpan,
  withFiber: () => withFiber2,
  withExecutionPlan: () => withExecutionPlan2,
  withErrorReporting: () => withErrorReporting2,
  withConcurrency: () => withConcurrency2,
  whileLoop: () => whileLoop2,
  when: () => when2,
  void: () => void_3,
  validate: () => validate2,
  useSpan: () => useSpan2,
  updateService: () => updateService2,
  updateContext: () => updateContext2,
  unwrapReason: () => unwrapReason2,
  uninterruptibleMask: () => uninterruptibleMask2,
  uninterruptible: () => uninterruptible2,
  undefined: () => undefined_2,
  txRetry: () => txRetry,
  tx: () => tx,
  tryPromise: () => tryPromise2,
  try: () => try_3,
  trackSuccesses: () => trackSuccesses,
  trackErrors: () => trackErrors,
  trackDuration: () => trackDuration,
  trackDefects: () => trackDefects,
  track: () => track,
  tracer: () => tracer2,
  timeoutOrElse: () => timeoutOrElse2,
  timeoutOption: () => timeoutOption2,
  timeout: () => timeout2,
  timed: () => timed2,
  tapErrorTag: () => tapErrorTag2,
  tapError: () => tapError2,
  tapDefect: () => tapDefect2,
  tapCauseIf: () => tapCauseIf2,
  tapCauseFilter: () => tapCauseFilter2,
  tapCause: () => tapCause2,
  tap: () => tap2,
  sync: () => sync2,
  suspend: () => suspend2,
  succeedSome: () => succeedSome2,
  succeedNone: () => succeedNone2,
  succeed: () => succeed5,
  spanLinks: () => spanLinks2,
  spanAnnotations: () => spanAnnotations2,
  sleep: () => sleep2,
  serviceOption: () => serviceOption2,
  service: () => service2,
  scopedWith: () => scopedWith2,
  scoped: () => scoped2,
  scope: () => scope2,
  scheduleFrom: () => scheduleFrom2,
  schedule: () => schedule,
  satisfiesSuccessType: () => satisfiesSuccessType,
  satisfiesServicesType: () => satisfiesServicesType,
  satisfiesErrorType: () => satisfiesErrorType,
  sandbox: () => sandbox2,
  runSyncWith: () => runSyncWith2,
  runSyncExitWith: () => runSyncExitWith2,
  runSyncExit: () => runSyncExit2,
  runSync: () => runSync2,
  runPromiseWith: () => runPromiseWith2,
  runPromiseExitWith: () => runPromiseExitWith2,
  runPromiseExit: () => runPromiseExit2,
  runPromise: () => runPromise2,
  runForkWith: () => runForkWith2,
  runFork: () => runFork2,
  runCallbackWith: () => runCallbackWith2,
  runCallback: () => runCallback2,
  retryOrElse: () => retryOrElse2,
  retry: () => retry2,
  result: () => result2,
  requestUnsafe: () => requestUnsafe2,
  request: () => request2,
  replicateEffect: () => replicateEffect2,
  replicate: () => replicate2,
  repeatOrElse: () => repeatOrElse2,
  repeat: () => repeat2,
  raceFirst: () => raceFirst2,
  raceAllFirst: () => raceAllFirst2,
  raceAll: () => raceAll2,
  race: () => race2,
  provideServiceEffect: () => provideServiceEffect2,
  provideService: () => provideService2,
  provideContext: () => provideContext2,
  provide: () => provide4,
  promise: () => promise2,
  partition: () => partition3,
  orElseSucceed: () => orElseSucceed2,
  orDie: () => orDie2,
  option: () => option2,
  onInterrupt: () => onInterrupt2,
  onExitPrimitive: () => onExitPrimitive2,
  onExitIf: () => onExitIf2,
  onExitFilter: () => onExitFilter2,
  onExit: () => onExit2,
  onErrorIf: () => onErrorIf2,
  onErrorFilter: () => onErrorFilter2,
  onError: () => onError2,
  never: () => never2,
  matchEffect: () => matchEffect3,
  matchEager: () => matchEager2,
  matchCauseEffectEager: () => matchCauseEffectEager2,
  matchCauseEffect: () => matchCauseEffect2,
  matchCauseEager: () => matchCauseEager2,
  matchCause: () => matchCause2,
  match: () => match5,
  mapErrorEager: () => mapErrorEager2,
  mapError: () => mapError3,
  mapEager: () => mapEager2,
  mapBothEager: () => mapBothEager2,
  mapBoth: () => mapBoth2,
  map: () => map5,
  makeSpanScoped: () => makeSpanScoped2,
  makeSpan: () => makeSpan2,
  logWithLevel: () => logWithLevel2,
  logWarning: () => logWarning,
  logTrace: () => logTrace,
  logInfo: () => logInfo,
  logFatal: () => logFatal,
  logError: () => logError,
  logDebug: () => logDebug,
  log: () => log,
  linkSpans: () => linkSpans2,
  let: () => let_3,
  isSuccess: () => isSuccess5,
  isFailure: () => isFailure4,
  isEffect: () => isEffect2,
  interruptibleMask: () => interruptibleMask2,
  interruptible: () => interruptible2,
  interrupt: () => interrupt2,
  ignoreCause: () => ignoreCause2,
  ignore: () => ignore2,
  gen: () => gen2,
  fromResult: () => fromResult2,
  fromOption: () => fromOption3,
  fromNullishOr: () => fromNullishOr3,
  forkScoped: () => forkScoped2,
  forkIn: () => forkIn2,
  forkDetach: () => forkDetach2,
  forkChild: () => forkChild2,
  forever: () => forever3,
  forEach: () => forEach2,
  fnUntracedEager: () => fnUntracedEager2,
  fnUntraced: () => fnUntraced2,
  fn: () => fn2,
  flip: () => flip2,
  flatten: () => flatten2,
  flatMapEager: () => flatMapEager2,
  flatMap: () => flatMap2,
  firstSuccessOf: () => firstSuccessOf2,
  findFirstFilter: () => findFirstFilter2,
  findFirst: () => findFirst2,
  filterOrFail: () => filterOrFail2,
  filterOrElse: () => filterOrElse2,
  filterMapOrFail: () => filterMapOrFail2,
  filterMapOrElse: () => filterMapOrElse2,
  filterMapEffect: () => filterMapEffect2,
  filterMap: () => filterMap2,
  filter: () => filter5,
  fiberId: () => fiberId2,
  fiber: () => fiber2,
  failSync: () => failSync2,
  failCauseSync: () => failCauseSync2,
  failCause: () => failCause3,
  fail: () => fail5,
  exit: () => exit2,
  eventually: () => eventually2,
  ensuring: () => ensuring2,
  effectify: () => effectify,
  die: () => die2,
  delay: () => delay2,
  currentSpan: () => currentSpan2,
  currentParentSpan: () => currentParentSpan2,
  contextWith: () => contextWith2,
  context: () => context2,
  clockWith: () => clockWith2,
  catchTags: () => catchTags2,
  catchTag: () => catchTag2,
  catchReasons: () => catchReasons2,
  catchReason: () => catchReason2,
  catchNoSuchElement: () => catchNoSuchElement2,
  catchIf: () => catchIf2,
  catchFilter: () => catchFilter2,
  catchEager: () => catchEager2,
  catchDefect: () => catchDefect2,
  catchCauseIf: () => catchCauseIf2,
  catchCauseFilter: () => catchCauseFilter2,
  catchCause: () => catchCause2,
  catch: () => catch_2,
  callback: () => callback2,
  cachedWithTTL: () => cachedWithTTL2,
  cachedInvalidateWithTTL: () => cachedInvalidateWithTTL2,
  cached: () => cached2,
  bindTo: () => bindTo3,
  bind: () => bind3,
  awaitAllChildren: () => awaitAllChildren2,
  asVoid: () => asVoid2,
  asSome: () => asSome2,
  as: () => as2,
  annotateSpans: () => annotateSpans2,
  annotateLogsScoped: () => annotateLogsScoped2,
  annotateLogs: () => annotateLogs,
  annotateCurrentSpan: () => annotateCurrentSpan2,
  andThen: () => andThen2,
  all: () => all2,
  addFinalizer: () => addFinalizer3,
  acquireUseRelease: () => acquireUseRelease2,
  acquireRelease: () => acquireRelease2,
  acquireDisposable: () => acquireDisposable2,
  abortSignal: () => abortSignal2,
  TypeId: () => TypeId11,
  Transaction: () => Transaction,
  Do: () => Do2
});

// node_modules/effect/dist/Effectable.js
var Prototype2 = (options) => makePrimitiveProto({
  op: options.label,
  [evaluate]: options.evaluate
});

// node_modules/effect/dist/Context.js
var ServiceTypeId = "~effect/Context/Service";
var Service = function() {
  const prevLimit = Error.stackTraceLimit;
  Error.stackTraceLimit = 2;
  const err = new Error;
  Error.stackTraceLimit = prevLimit;
  function KeyClass() {}
  const self = KeyClass;
  Object.setPrototypeOf(self, ServiceProto);
  Object.defineProperty(self, "stack", {
    get() {
      return err.stack;
    }
  });
  if (arguments.length > 0) {
    self.key = arguments[0];
    if (arguments[1]?.defaultValue) {
      self[ReferenceTypeId] = ReferenceTypeId;
      self.defaultValue = arguments[1].defaultValue;
    }
    return self;
  }
  return function(key, options) {
    self.key = key;
    if (options?.make) {
      self.make = options.make;
    }
    return self;
  };
};
var ServiceProto = {
  [ServiceTypeId]: ServiceTypeId,
  .../* @__PURE__ */ Prototype2({
    label: "Service",
    evaluate(fiber) {
      return exitSucceed(get(fiber.context, this));
    }
  }),
  toJSON() {
    return {
      _id: "Service",
      key: this.key,
      stack: this.stack
    };
  },
  of(self) {
    return self;
  },
  context(self) {
    return make6(this, self);
  },
  use(f) {
    return withFiber((fiber) => f(get(fiber.context, this)));
  },
  useSync(f) {
    return withFiber((fiber) => exitSucceed(f(get(fiber.context, this))));
  }
};
var ReferenceTypeId = "~effect/Context/Reference";
var TypeId4 = "~effect/Context";
var makeUnsafe = (mapUnsafe) => {
  const self = Object.create(Proto);
  self.mapUnsafe = mapUnsafe;
  self.mutable = false;
  return self;
};
var Proto = {
  ...PipeInspectableProto,
  [TypeId4]: {
    _Services: (_) => _
  },
  toJSON() {
    return {
      _id: "Context",
      services: Array.from(this.mapUnsafe).map(([key, value]) => ({
        key,
        value
      }))
    };
  },
  [symbol2](that) {
    if (!isContext(that) || this.mapUnsafe.size !== that.mapUnsafe.size)
      return false;
    for (const k of this.mapUnsafe.keys()) {
      if (!that.mapUnsafe.has(k) || !equals(this.mapUnsafe.get(k), that.mapUnsafe.get(k))) {
        return false;
      }
    }
    return true;
  },
  [symbol]() {
    return number(this.mapUnsafe.size);
  }
};
var isContext = (u) => hasProperty(u, TypeId4);
var isReference = (u) => hasProperty(u, ReferenceTypeId);
var empty = () => emptyContext2;
var emptyContext2 = /* @__PURE__ */ makeUnsafe(/* @__PURE__ */ new Map);
var make6 = (key, service) => makeUnsafe(new Map([[key.key, service]]));
var add = /* @__PURE__ */ dual(3, (self, key, service) => withMapUnsafe(self, (map2) => {
  map2.set(key.key, service);
}));
var getOrElse2 = /* @__PURE__ */ dual(3, (self, key, orElse) => {
  if (self.mapUnsafe.has(key.key)) {
    return self.mapUnsafe.get(key.key);
  }
  return isReference(key) ? getDefaultValue(key) : orElse();
});
var getUnsafe = /* @__PURE__ */ dual(2, (self, service) => {
  if (!self.mapUnsafe.has(service.key)) {
    if (ReferenceTypeId in service)
      return getDefaultValue(service);
    throw serviceNotFoundError(service);
  }
  return self.mapUnsafe.get(service.key);
});
var get = getUnsafe;
var getReferenceUnsafe = (self, service) => {
  if (!self.mapUnsafe.has(service.key)) {
    return getDefaultValue(service);
  }
  return self.mapUnsafe.get(service.key);
};
var defaultValueCacheKey = "~effect/Context/defaultValue";
var getDefaultValue = (ref) => {
  if (defaultValueCacheKey in ref) {
    return ref[defaultValueCacheKey];
  }
  return ref[defaultValueCacheKey] = ref.defaultValue();
};
var serviceNotFoundError = (service) => {
  const error = new Error(`Service not found${service.key ? `: ${String(service.key)}` : ""}`);
  if (service.stack) {
    const lines = service.stack.split(`
`);
    if (lines.length > 2) {
      const afterAt = lines[2].match(/at (.*)/);
      if (afterAt) {
        error.message = error.message + ` (defined at ${afterAt[1]})`;
      }
    }
  }
  if (error.stack) {
    const lines = error.stack.split(`
`);
    lines.splice(1, 3);
    error.stack = lines.join(`
`);
  }
  return error;
};
var getOption = /* @__PURE__ */ dual(2, (self, service) => {
  if (self.mapUnsafe.has(service.key)) {
    return some2(self.mapUnsafe.get(service.key));
  }
  return isReference(service) ? some2(getDefaultValue(service)) : none2();
});
var merge = /* @__PURE__ */ dual(2, (self, that) => {
  if (self.mapUnsafe.size === 0)
    return that;
  if (that.mapUnsafe.size === 0)
    return self;
  return withMapUnsafe(self, (map2) => {
    that.mapUnsafe.forEach((value, key) => map2.set(key, value));
  });
});
var mergeAll = (...ctxs) => {
  const map2 = new Map;
  for (let i = 0;i < ctxs.length; i++) {
    ctxs[i].mapUnsafe.forEach((value, key) => {
      map2.set(key, value);
    });
  }
  return makeUnsafe(map2);
};
var withMapUnsafe = (self, f) => {
  if (self.mutable) {
    f(self.mapUnsafe);
    return self;
  }
  const map2 = new Map(self.mapUnsafe);
  f(map2);
  return makeUnsafe(map2);
};
var Reference = Service;

// node_modules/effect/dist/internal/array.js
var isArrayNonEmpty = (self) => self.length > 0;

// node_modules/effect/dist/Result.js
var succeed2 = succeed;
var fail2 = fail;
var try_ = (evaluate2) => {
  if (isFunction(evaluate2)) {
    try {
      return succeed2(evaluate2());
    } catch (e) {
      return fail2(e);
    }
  } else {
    try {
      return succeed2(evaluate2.try());
    } catch (e) {
      return fail2(evaluate2.catch(e));
    }
  }
};
var isFailure2 = isFailure;
var isSuccess2 = isSuccess;
var match3 = /* @__PURE__ */ dual(2, (self, {
  onFailure,
  onSuccess
}) => isFailure2(self) ? onFailure(self.failure) : onSuccess(self.success));

// node_modules/effect/dist/Tuple.js
var makeEquivalence = Tuple;

// node_modules/effect/dist/Iterable.js
var constEmpty = {
  [Symbol.iterator]() {
    return constEmptyIterator;
  }
};
var constEmptyIterator = {
  next() {
    return {
      done: true,
      value: undefined
    };
  }
};
var filter2 = /* @__PURE__ */ dual(2, (self, predicate) => ({
  [Symbol.iterator]() {
    const iterator = self[Symbol.iterator]();
    let i = 0;
    return {
      next() {
        let result = iterator.next();
        while (!result.done) {
          if (predicate(result.value, i++)) {
            return {
              done: false,
              value: result.value
            };
          }
          result = iterator.next();
        }
        return {
          done: true,
          value: undefined
        };
      }
    };
  }
}));

// node_modules/effect/dist/Record.js
var isEmptyRecord = (self) => Object.keys(self).length === 0;
var has = /* @__PURE__ */ dual(2, (self, key) => Object.hasOwn(self, key));
var map2 = /* @__PURE__ */ dual(2, (self, f) => {
  const out = {
    ...self
  };
  for (const key of keys(self)) {
    out[key] = f(self[key], key);
  }
  return out;
});
var keys = (self) => Object.keys(self);
var isSubrecordBy = (equivalence) => dual(2, (self, that) => {
  for (const key of keys(self)) {
    if (!has(that, key) || !equivalence(self[key], that[key])) {
      return false;
    }
  }
  return true;
});
var makeEquivalence2 = (equivalence) => {
  const is = isSubrecordBy(equivalence);
  return (self, that) => is(self, that) && is(that, self);
};

// node_modules/effect/dist/Array.js
var Array2 = globalThis.Array;
var allocate = (n) => new Array2(n);
var fromIterable = (collection) => Array2.isArray(collection) ? collection : Array2.from(collection);
var append = /* @__PURE__ */ dual(2, (self, last) => [...self, last]);
var appendAll = /* @__PURE__ */ dual(2, (self, that) => fromIterable(self).concat(fromIterable(that)));
var isArray = Array2.isArray;
var isArrayNonEmpty2 = isArrayNonEmpty;
var isReadonlyArrayNonEmpty = isArrayNonEmpty;
function isOutOfBounds(i, as) {
  return i < 0 || i >= as.length;
}
var getUnsafe2 = /* @__PURE__ */ dual(2, (self, index) => {
  const i = Math.floor(index);
  if (isOutOfBounds(i, self)) {
    throw new Error(`Index out of bounds: ${i}`);
  }
  return self[i];
});
var headNonEmpty = /* @__PURE__ */ getUnsafe2(0);
var tailNonEmpty = (self) => self.slice(1);
var sort = /* @__PURE__ */ dual(2, (self, O) => {
  const out = Array2.from(self);
  out.sort(O);
  return out;
});
var unionWith = /* @__PURE__ */ dual(3, (self, that, isEquivalent) => {
  const a = fromIterable(self);
  const b = fromIterable(that);
  if (isReadonlyArrayNonEmpty(a)) {
    if (isReadonlyArrayNonEmpty(b)) {
      const dedupe = dedupeWith(isEquivalent);
      return dedupe(appendAll(a, b));
    }
    return a;
  }
  return b;
});
var union = /* @__PURE__ */ dual(2, (self, that) => unionWith(self, that, asEquivalence()));
var empty2 = () => [];
var of = (a) => [a];
var map3 = /* @__PURE__ */ dual(2, (self, f) => self.map(f));
var filter3 = /* @__PURE__ */ dual(2, (self, predicate) => {
  const as = fromIterable(self);
  const out = [];
  for (let i = 0;i < as.length; i++) {
    if (predicate(as[i], i)) {
      out.push(as[i]);
    }
  }
  return out;
});
var partition = /* @__PURE__ */ dual(2, (self, f) => {
  const excluded = [];
  const satisfying = [];
  let i = 0;
  for (const a of self) {
    const result = f(a, i++);
    if (isSuccess2(result)) {
      satisfying.push(result.success);
    } else {
      excluded.push(result.failure);
    }
  }
  return [excluded, satisfying];
});
var makeEquivalence3 = Array_;
var dedupeWith = /* @__PURE__ */ dual(2, (self, isEquivalent) => {
  const input = fromIterable(self);
  if (isReadonlyArrayNonEmpty(input)) {
    const out = [headNonEmpty(input)];
    const rest = tailNonEmpty(input);
    for (const r of rest) {
      if (out.every((a) => !isEquivalent(r, a))) {
        out.push(r);
      }
    }
    return out;
  }
  return [];
});

// node_modules/effect/dist/Filter.js
var composePassthrough = /* @__PURE__ */ dual(2, (left, right) => (input) => {
  const leftOut = left(input);
  if (isFailure2(leftOut))
    return fail2(input);
  const rightOut = right(leftOut.success);
  if (isFailure2(rightOut))
    return fail2(input);
  return rightOut;
});

// node_modules/effect/dist/Scheduler.js
var Scheduler = /* @__PURE__ */ Reference("effect/Scheduler", {
  defaultValue: () => new MixedScheduler
});
var setImmediate = "setImmediate" in globalThis ? (f) => {
  const timer = globalThis.setImmediate(f);
  return () => globalThis.clearImmediate(timer);
} : (f) => {
  const timer = setTimeout(f, 0);
  return () => clearTimeout(timer);
};

class PriorityBuckets {
  buckets = [];
  scheduleTask(task, priority) {
    const buckets = this.buckets;
    const len = buckets.length;
    let bucket;
    let index = 0;
    for (;index < len; index++) {
      if (buckets[index][0] > priority)
        break;
      bucket = buckets[index];
    }
    if (bucket && bucket[0] === priority) {
      bucket[1].push(task);
    } else if (index === len) {
      buckets.push([priority, [task]]);
    } else {
      buckets.splice(index, 0, [priority, [task]]);
    }
  }
  drain() {
    const buckets = this.buckets;
    this.buckets = [];
    return buckets;
  }
}

class MixedScheduler {
  executionMode;
  setImmediate;
  constructor(executionMode = "async", setImmediateFn = setImmediate) {
    this.executionMode = executionMode;
    this.setImmediate = setImmediateFn;
  }
  shouldYield(fiber) {
    return fiber.currentOpCount >= fiber.maxOpsBeforeYield;
  }
  makeDispatcher() {
    return new MixedSchedulerDispatcher(this.setImmediate);
  }
}

class MixedSchedulerDispatcher {
  tasks = /* @__PURE__ */ new PriorityBuckets;
  running = undefined;
  setImmediate;
  constructor(setImmediateFn = setImmediate) {
    this.setImmediate = setImmediateFn;
  }
  scheduleTask(task, priority) {
    this.tasks.scheduleTask(task, priority);
    if (this.running === undefined) {
      this.running = this.setImmediate(this.afterScheduled);
    }
  }
  afterScheduled = () => {
    this.running = undefined;
    this.runTasks();
  };
  runTasks() {
    const buckets = this.tasks.drain();
    for (let i = 0;i < buckets.length; i++) {
      const toRun = buckets[i][1];
      for (let j = 0;j < toRun.length; j++) {
        toRun[j]();
      }
    }
  }
  flush() {
    while (this.tasks.buckets.length > 0) {
      if (this.running !== undefined) {
        this.running();
        this.running = undefined;
      }
      this.runTasks();
    }
  }
}
var MaxOpsBeforeYield = /* @__PURE__ */ Reference("effect/Scheduler/MaxOpsBeforeYield", {
  defaultValue: () => 2048
});
var PreventSchedulerYield = /* @__PURE__ */ Reference("effect/Scheduler/PreventSchedulerYield", {
  defaultValue: () => false
});

// node_modules/effect/dist/Tracer.js
var ParentSpanKey = "effect/Tracer/ParentSpan";

class ParentSpan extends (/* @__PURE__ */ Service()(ParentSpanKey)) {
}
var make7 = (options) => options;
var DisablePropagation = /* @__PURE__ */ Reference("effect/Tracer/DisablePropagation", {
  defaultValue: constFalse
});
var CurrentTraceLevel = /* @__PURE__ */ Reference("effect/Tracer/CurrentTraceLevel", {
  defaultValue: () => "Info"
});
var MinimumTraceLevel = /* @__PURE__ */ Reference("effect/Tracer/MinimumTraceLevel", {
  defaultValue: () => "All"
});
var TracerKey = "effect/Tracer";
var Tracer = /* @__PURE__ */ Reference(TracerKey, {
  defaultValue: () => make7({
    span: (options) => new NativeSpan(options)
  })
});

class NativeSpan {
  _tag = "Span";
  spanId;
  traceId = "native";
  sampled;
  name;
  parent;
  annotations;
  links;
  startTime;
  kind;
  status;
  attributes;
  events = [];
  constructor(options) {
    this.name = options.name;
    this.parent = options.parent;
    this.annotations = options.annotations;
    this.links = options.links;
    this.startTime = options.startTime;
    this.kind = options.kind;
    this.sampled = options.sampled;
    this.status = {
      _tag: "Started",
      startTime: options.startTime
    };
    this.attributes = new Map;
    this.traceId = getOrUndefined(options.parent)?.traceId ?? randomHexString(32);
    this.spanId = randomHexString(16);
  }
  end(endTime, exit) {
    this.status = {
      _tag: "Ended",
      endTime,
      exit,
      startTime: this.status.startTime
    };
  }
  attribute(key, value) {
    this.attributes.set(key, value);
  }
  event(name, startTime, attributes) {
    this.events.push([name, startTime, attributes ?? {}]);
  }
  addLinks(links) {
    this.links.push(...links);
  }
}
var randomHexString = /* @__PURE__ */ function() {
  const characters = "abcdef0123456789";
  const charactersLength = characters.length;
  return function(length) {
    let result = "";
    for (let i = 0;i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
  };
}();

// node_modules/effect/dist/internal/metric.js
var FiberRuntimeMetricsKey = "effect/observability/Metric/FiberRuntimeMetricsKey";

// node_modules/effect/dist/internal/references.js
var CurrentConcurrency = /* @__PURE__ */ Reference("effect/References/CurrentConcurrency", {
  defaultValue: () => "unbounded"
});
var CurrentErrorReporters = /* @__PURE__ */ Reference("effect/ErrorReporter/CurrentErrorReporters", {
  defaultValue: () => new Set
});
var CurrentStackFrame = /* @__PURE__ */ Reference("effect/References/CurrentStackFrame", {
  defaultValue: constUndefined
});
var TracerEnabled = /* @__PURE__ */ Reference("effect/References/TracerEnabled", {
  defaultValue: constTrue
});
var TracerTimingEnabled = /* @__PURE__ */ Reference("effect/References/TracerTimingEnabled", {
  defaultValue: constTrue
});
var TracerSpanAnnotations = /* @__PURE__ */ Reference("effect/References/TracerSpanAnnotations", {
  defaultValue: () => ({})
});
var TracerSpanLinks = /* @__PURE__ */ Reference("effect/References/TracerSpanLinks", {
  defaultValue: () => []
});
var CurrentLogAnnotations = /* @__PURE__ */ Reference("effect/References/CurrentLogAnnotations", {
  defaultValue: () => ({})
});
var CurrentLogLevel = /* @__PURE__ */ Reference("effect/References/CurrentLogLevel", {
  defaultValue: () => "Info"
});
var MinimumLogLevel = /* @__PURE__ */ Reference("effect/References/MinimumLogLevel", {
  defaultValue: () => "Info"
});
var CurrentLogSpans = /* @__PURE__ */ Reference("effect/References/CurrentLogSpans", {
  defaultValue: () => []
});

// node_modules/effect/dist/internal/tracer.js
var addSpanStackTrace = (options) => {
  if (options?.captureStackTrace === false) {
    return options;
  } else if (options?.captureStackTrace !== undefined && typeof options.captureStackTrace !== "boolean") {
    return options;
  }
  const limit = Error.stackTraceLimit;
  Error.stackTraceLimit = 3;
  const traceError = new Error;
  Error.stackTraceLimit = limit;
  return {
    ...options,
    captureStackTrace: spanCleaner(() => traceError.stack)
  };
};
var makeStackCleaner = (line) => (stack) => {
  let cache;
  return () => {
    if (cache !== undefined)
      return cache;
    const trace = stack();
    if (!trace)
      return;
    const lines = trace.split(`
`);
    if (lines[line] !== undefined) {
      cache = lines[line].trim();
      return cache;
    }
  };
};
var spanCleaner = /* @__PURE__ */ makeStackCleaner(3);

// node_modules/effect/dist/internal/version.js
var version = "dev";

// node_modules/effect/dist/internal/effect.js
class Interrupt extends ReasonBase {
  fiberId;
  constructor(fiberId, annotations = constEmptyAnnotations) {
    super("Interrupt", annotations, "Interrupted");
    this.fiberId = fiberId;
  }
  toString() {
    return `Interrupt(${this.fiberId})`;
  }
  toJSON() {
    return {
      _tag: "Interrupt",
      fiberId: this.fiberId
    };
  }
  [symbol2](that) {
    return isInterruptReason(that) && this.fiberId === that.fiberId && this.annotations === that.annotations;
  }
  [symbol]() {
    return combine(string(`${this._tag}:${this.fiberId}`))(random(this.annotations));
  }
}
var causeInterrupt = (fiberId) => new CauseImpl([new Interrupt(fiberId)]);
var findFail = (self) => {
  const reason = self.reasons.find(isFailReason);
  return reason ? succeed2(reason) : fail2(self);
};
var findError = (self) => {
  for (let i = 0;i < self.reasons.length; i++) {
    const reason = self.reasons[i];
    if (reason._tag === "Fail") {
      return succeed2(reason.error);
    }
  }
  return fail2(self);
};
var hasDies = (self) => self.reasons.some(isDieReason);
var findDefect = (self) => {
  const reason = self.reasons.find(isDieReason);
  return reason ? succeed2(reason.defect) : fail2(self);
};
var hasInterrupts = (self) => self.reasons.some(isInterruptReason);
var causeFilterInterruptors = (self) => {
  let interruptors;
  for (let i = 0;i < self.reasons.length; i++) {
    const f = self.reasons[i];
    if (f._tag !== "Interrupt")
      continue;
    interruptors ??= new Set;
    if (f.fiberId !== undefined) {
      interruptors.add(f.fiberId);
    }
  }
  return interruptors ? succeed2(interruptors) : fail2(self);
};
var causeCombine = /* @__PURE__ */ dual(2, (self, that) => {
  if (self.reasons.length === 0) {
    return that;
  } else if (that.reasons.length === 0) {
    return self;
  }
  const newCause = new CauseImpl(union(self.reasons, that.reasons));
  return equals(self, newCause) ? self : newCause;
});
var causePartition = (self) => {
  const obj = {
    Fail: [],
    Die: [],
    Interrupt: []
  };
  for (let i = 0;i < self.reasons.length; i++) {
    obj[self.reasons[i]._tag].push(self.reasons[i]);
  }
  return obj;
};
var causeSquash = (self) => {
  const partitioned = causePartition(self);
  if (partitioned.Fail.length > 0) {
    return partitioned.Fail[0].error;
  } else if (partitioned.Die.length > 0) {
    return partitioned.Die[0].defect;
  } else if (partitioned.Interrupt.length > 0) {
    return new globalThis.Error("All fibers interrupted without error");
  }
  return new globalThis.Error("Empty cause");
};
var causePrettyErrors = (self) => {
  const errors = [];
  const interrupts = [];
  if (self.reasons.length === 0)
    return errors;
  const prevStackLimit = Error.stackTraceLimit;
  Error.stackTraceLimit = 1;
  for (const failure of self.reasons) {
    if (failure._tag === "Interrupt") {
      interrupts.push(failure);
      continue;
    }
    errors.push(causePrettyError(failure._tag === "Die" ? failure.defect : failure.error, failure.annotations));
  }
  if (errors.length === 0) {
    const cause = new Error("The fiber was interrupted by:");
    cause.name = "InterruptCause";
    cause.stack = interruptCauseStack(cause, interrupts);
    const error = new globalThis.Error("All fibers interrupted without error", {
      cause
    });
    error.name = "InterruptError";
    error.stack = `${error.name}: ${error.message}`;
    errors.push(causePrettyError(error, interrupts[0].annotations));
  }
  Error.stackTraceLimit = prevStackLimit;
  return errors;
};
var causePrettyError = (original, annotations) => {
  const kind = typeof original;
  let error;
  if (original && kind === "object") {
    error = new globalThis.Error(causePrettyMessage(original), {
      cause: original.cause ? causePrettyError(original.cause) : undefined
    });
    if (typeof original.name === "string") {
      error.name = original.name;
    }
    if (typeof original.stack === "string") {
      error.stack = cleanErrorStack(original.stack, error, annotations);
    } else {
      const stack = `${error.name}: ${error.message}`;
      error.stack = annotations ? addStackAnnotations(stack, annotations) : stack;
    }
    for (const key of Object.keys(original)) {
      if (!(key in error)) {
        error[key] = original[key];
      }
    }
  } else {
    error = new globalThis.Error(!original ? `Unknown error: ${original}` : kind === "string" ? original : formatJson(original));
  }
  return error;
};
var causePrettyMessage = (u) => {
  if (typeof u.message === "string") {
    return u.message;
  } else if (typeof u.toString === "function" && u.toString !== Object.prototype.toString && u.toString !== Array.prototype.toString) {
    try {
      return u.toString();
    } catch {}
  }
  return formatJson(u);
};
var locationRegExp = /\((.*)\)/g;
var cleanErrorStack = (stack, error, annotations) => {
  const message = `${error.name}: ${error.message}`;
  const lines = (stack.startsWith(message) ? stack.slice(message.length) : stack).split(`
`);
  const out = [message];
  for (let i = 1;i < lines.length; i++) {
    if (/(?:Generator\.next|~effect\/Effect)/.test(lines[i])) {
      break;
    }
    out.push(lines[i]);
  }
  return annotations ? addStackAnnotations(out.join(`
`), annotations) : out.join(`
`);
};
var addStackAnnotations = (stack, annotations) => {
  const frame = annotations?.get(StackTraceKey.key);
  if (frame) {
    stack = `${stack}
${currentStackTrace(frame)}`;
  }
  return stack;
};
var interruptCauseStack = (error, interrupts) => {
  const out = [`${error.name}: ${error.message}`];
  for (const current of interrupts) {
    const fiberId = current.fiberId !== undefined ? `#${current.fiberId}` : "unknown";
    const frame = current.annotations.get(InterruptorStackTrace.key);
    out.push(`    at fiber (${fiberId})`);
    if (frame)
      out.push(currentStackTrace(frame));
  }
  return out.join(`
`);
};
var currentStackTrace = (frame) => {
  const out = [];
  let current = frame;
  let i = 0;
  while (current && i < 10) {
    const stack = current.stack();
    if (stack) {
      const locationMatchAll = stack.matchAll(locationRegExp);
      let match4 = false;
      for (const [, location2] of locationMatchAll) {
        match4 = true;
        out.push(`    at ${current.name} (${location2})`);
      }
      if (!match4) {
        out.push(`    at ${current.name} (${stack.replace(/^at /, "")})`);
      }
    } else {
      out.push(`    at ${current.name}`);
    }
    current = current.parent;
    i++;
  }
  return out.join(`
`);
};
var causePretty = (cause) => causePrettyErrors(cause).map((e) => e.cause ? `${e.stack} {
${renderErrorCause(e.cause, "  ")}
}` : e.stack).join(`
`);
var renderErrorCause = (cause, prefix) => {
  const lines = cause.stack.split(`
`);
  let stack = `${prefix}[cause]: ${lines[0]}`;
  for (let i = 1, len = lines.length;i < len; i++) {
    stack += `
${prefix}${lines[i]}`;
  }
  if (cause.cause) {
    stack += ` {
${renderErrorCause(cause.cause, `${prefix}  `)}
${prefix}}`;
  }
  return stack;
};
var FiberTypeId = `~effect/Fiber/${version}`;
var fiberVariance = {
  _A: identity,
  _E: identity
};
var fiberIdStore = {
  id: 0
};
var getCurrentFiber = () => globalThis[currentFiberTypeId];

class FiberImpl {
  constructor(context, interruptible = true) {
    this[FiberTypeId] = fiberVariance;
    this.setContext(context);
    this.id = ++fiberIdStore.id;
    this.currentOpCount = 0;
    this.currentLoopCount = 0;
    this.interruptible = interruptible;
    this._stack = [];
    this._observers = [];
    this._exit = undefined;
    this._children = undefined;
    this._interruptedCause = undefined;
    this._yielded = undefined;
    this.runtimeMetrics?.recordFiberStart(this.context);
  }
  [FiberTypeId];
  id;
  interruptible;
  currentOpCount;
  currentLoopCount;
  _stack;
  _observers;
  _exit;
  _currentExit;
  _children;
  _interruptedCause;
  _yielded;
  context;
  currentScheduler;
  currentTracerContext;
  currentSpan;
  currentLogLevel;
  minimumLogLevel;
  currentStackFrame;
  runtimeMetrics;
  maxOpsBeforeYield;
  currentPreventYield;
  _dispatcher = undefined;
  get currentDispatcher() {
    return this._dispatcher ??= this.currentScheduler.makeDispatcher();
  }
  getRef(ref) {
    return getReferenceUnsafe(this.context, ref);
  }
  addObserver(cb) {
    if (this._exit) {
      cb(this._exit);
      return constVoid;
    }
    this._observers.push(cb);
    return () => {
      const index = this._observers.indexOf(cb);
      if (index >= 0) {
        this._observers.splice(index, 1);
      }
    };
  }
  interruptUnsafe(fiberId, annotations) {
    if (this._exit) {
      return;
    }
    let cause = causeInterrupt(fiberId);
    if (this.currentStackFrame) {
      cause = causeAnnotate(cause, make6(StackTraceKey, this.currentStackFrame));
    }
    if (annotations) {
      cause = causeAnnotate(cause, annotations);
    }
    this._interruptedCause = this._interruptedCause ? causeCombine(this._interruptedCause, cause) : cause;
    if (this.interruptible) {
      this.evaluate(failCause(this._interruptedCause));
    }
  }
  pollUnsafe() {
    return this._exit;
  }
  evaluate(effect) {
    if (this._exit) {
      return;
    } else if (this._yielded !== undefined) {
      const yielded = this._yielded;
      this._yielded = undefined;
      yielded();
    }
    const exit = this.runLoop(effect);
    if (exit === Yield) {
      return;
    }
    const interruptChildren = fiberMiddleware.interruptChildren && fiberMiddleware.interruptChildren(this);
    if (interruptChildren !== undefined) {
      return this.evaluate(flatMap(interruptChildren, () => exit));
    }
    this._exit = exit;
    this.runtimeMetrics?.recordFiberEnd(this.context, this._exit);
    for (let i = 0;i < this._observers.length; i++) {
      this._observers[i](exit);
    }
    this._observers.length = 0;
  }
  runLoop(effect) {
    const prevFiber = globalThis[currentFiberTypeId];
    globalThis[currentFiberTypeId] = this;
    let yielding = false;
    let current = effect;
    this.currentOpCount = 0;
    const currentLoop = ++this.currentLoopCount;
    try {
      while (true) {
        this.currentOpCount++;
        if (!yielding && !this.currentPreventYield && this.currentScheduler.shouldYield(this)) {
          yielding = true;
          const prev = current;
          current = flatMap(yieldNow, () => prev);
        }
        current = this.currentTracerContext ? this.currentTracerContext(current, this) : current[evaluate](this);
        if (currentLoop !== this.currentLoopCount) {
          return Yield;
        } else if (current === Yield) {
          const yielded = this._yielded;
          if (ExitTypeId in yielded) {
            this._yielded = undefined;
            return yielded;
          }
          return Yield;
        }
      }
    } catch (error) {
      if (!hasProperty(current, evaluate)) {
        return exitDie(`Fiber.runLoop: Not a valid effect: ${String(current)}`);
      }
      return this.runLoop(exitDie(error));
    } finally {
      globalThis[currentFiberTypeId] = prevFiber;
    }
  }
  getCont(symbol3) {
    while (true) {
      const op = this._stack.pop();
      if (!op)
        return;
      const cont = op[contAll] && op[contAll](this);
      if (cont) {
        cont[symbol3] = cont;
        return cont;
      }
      if (op[symbol3])
        return op;
    }
  }
  yieldWith(value) {
    this._yielded = value;
    return Yield;
  }
  children() {
    return this._children ??= new Set;
  }
  pipe() {
    return pipeArguments(this, arguments);
  }
  setContext(context) {
    this.context = context;
    const scheduler = this.getRef(Scheduler);
    if (scheduler !== this.currentScheduler) {
      this.currentScheduler = scheduler;
      this._dispatcher = undefined;
    }
    this.currentSpan = context.mapUnsafe.get(ParentSpanKey);
    this.currentLogLevel = this.getRef(CurrentLogLevel);
    this.minimumLogLevel = this.getRef(MinimumLogLevel);
    this.currentStackFrame = context.mapUnsafe.get(CurrentStackFrame.key);
    this.maxOpsBeforeYield = this.getRef(MaxOpsBeforeYield);
    this.currentPreventYield = this.getRef(PreventSchedulerYield);
    this.runtimeMetrics = context.mapUnsafe.get(FiberRuntimeMetricsKey);
    const currentTracer = context.mapUnsafe.get(TracerKey);
    this.currentTracerContext = currentTracer ? currentTracer["context"] : undefined;
  }
  get currentSpanLocal() {
    return this.currentSpan?._tag === "Span" ? this.currentSpan : undefined;
  }
}
var fiberMiddleware = {
  interruptChildren: undefined
};
var fiberStackAnnotations = (fiber) => {
  if (!fiber.currentStackFrame)
    return;
  const annotations = new Map;
  annotations.set(StackTraceKey.key, fiber.currentStackFrame);
  return makeUnsafe(annotations);
};
var fiberInterruptChildren = (fiber) => {
  if (fiber._children === undefined || fiber._children.size === 0) {
    return;
  }
  return fiberInterruptAll(fiber._children);
};
var fiberAwait = (self) => {
  const impl = self;
  if (impl._exit)
    return succeed3(impl._exit);
  return callback((resume) => {
    if (impl._exit)
      return resume(succeed3(impl._exit));
    return sync(self.addObserver((exit) => resume(succeed3(exit))));
  });
};
var fiberAwaitAll = (self) => callback((resume) => {
  const iter = self[Symbol.iterator]();
  const exits = [];
  let cancel = undefined;
  function loop() {
    let result = iter.next();
    while (!result.done) {
      if (result.value._exit) {
        exits.push(result.value._exit);
        result = iter.next();
        continue;
      }
      cancel = result.value.addObserver((exit) => {
        exits.push(exit);
        loop();
      });
      return;
    }
    resume(succeed3(exits));
  }
  loop();
  return sync(() => cancel?.());
});
var fiberInterrupt = (self) => withFiber((fiber) => fiberInterruptAs(self, fiber.id));
var fiberInterruptAs = /* @__PURE__ */ dual((args2) => hasProperty(args2[0], FiberTypeId), (self, fiberId, annotations) => withFiber((parent) => {
  let ann = fiberStackAnnotations(parent);
  ann = ann && annotations ? merge(ann, annotations) : ann ?? annotations;
  self.interruptUnsafe(fiberId, ann);
  return asVoid(fiberAwait(self));
}));
var fiberInterruptAll = (fibers) => withFiber((parent) => {
  const annotations = fiberStackAnnotations(parent);
  for (const fiber of fibers) {
    fiber.interruptUnsafe(parent.id, annotations);
  }
  return asVoid(fiberAwaitAll(fibers));
});
var succeed3 = exitSucceed;
var failCause = exitFailCause;
var fail3 = exitFail;
var sync = /* @__PURE__ */ makePrimitive({
  op: "Sync",
  [evaluate](fiber) {
    const value = this[args]();
    const cont = fiber.getCont(contA);
    return cont ? cont[contA](value, fiber) : fiber.yieldWith(exitSucceed(value));
  }
});
var suspend = /* @__PURE__ */ makePrimitive({
  op: "Suspend",
  [evaluate](_fiber) {
    return this[args]();
  }
});
var fromOption2 = /* @__PURE__ */ match({
  onNone: () => fail3(new NoSuchElementError("Effect.fromOption: Option.none")),
  onSome: succeed3
});
var fromResult = /* @__PURE__ */ match3({
  onFailure: fail3,
  onSuccess: succeed3
});
var fromNullishOr2 = (value) => value == null ? fail3(new NoSuchElementError) : succeed3(value);
var yieldNowWith = /* @__PURE__ */ makePrimitive({
  op: "Yield",
  [evaluate](fiber) {
    let resumed = false;
    fiber.currentDispatcher.scheduleTask(() => {
      if (resumed)
        return;
      fiber.evaluate(exitVoid);
    }, this[args] ?? 0);
    return fiber.yieldWith(() => {
      resumed = true;
    });
  }
});
var yieldNow = /* @__PURE__ */ yieldNowWith(0);
var succeedSome = (a) => succeed3(some2(a));
var succeedNone = /* @__PURE__ */ succeed3(/* @__PURE__ */ none2());
var failCauseSync = (evaluate2) => suspend(() => failCause(internalCall(evaluate2)));
var die = (defect) => exitDie(defect);
var failSync = (error) => suspend(() => fail3(internalCall(error)));
var void_ = /* @__PURE__ */ succeed3(undefined);
var try_2 = (options) => suspend(() => {
  try {
    return succeed3(internalCall(options.try));
  } catch (err) {
    return fail3(internalCall(() => options.catch(err)));
  }
});
var promise = (evaluate2) => callbackOptions(function(resume, signal) {
  internalCall(() => evaluate2(signal)).then((a) => resume(succeed3(a)), (e) => resume(die(e)));
}, evaluate2.length !== 0);
var tryPromise = (options) => {
  const f = typeof options === "function" ? options : options.try;
  const catcher = typeof options === "function" ? (cause) => new UnknownError(cause, "An error occurred in Effect.tryPromise") : options.catch;
  return callbackOptions(function(resume, signal) {
    try {
      internalCall(() => f(signal)).then((a) => resume(succeed3(a)), (e) => resume(fail3(internalCall(() => catcher(e)))));
    } catch (err) {
      resume(fail3(internalCall(() => catcher(err))));
    }
  }, eval.length !== 0);
};
var withFiberId = (f) => withFiber((fiber) => f(fiber.id));
var fiber = /* @__PURE__ */ withFiber(succeed3);
var fiberId = /* @__PURE__ */ withFiberId(succeed3);
var callbackOptions = /* @__PURE__ */ makePrimitive({
  op: "Async",
  single: false,
  [evaluate](fiber2) {
    const register = internalCall(() => this[args][0].bind(fiber2.currentScheduler));
    let resumed = false;
    let yielded = false;
    const controller = this[args][1] ? new AbortController : undefined;
    const onCancel = register((effect) => {
      if (resumed)
        return;
      resumed = true;
      if (yielded) {
        fiber2.evaluate(effect);
      } else {
        yielded = effect;
      }
    }, controller?.signal);
    if (yielded !== false)
      return yielded;
    yielded = true;
    fiber2._yielded = () => {
      resumed = true;
    };
    if (controller === undefined && onCancel === undefined) {
      return Yield;
    }
    fiber2._stack.push(asyncFinalizer(() => {
      resumed = true;
      controller?.abort();
      return onCancel ?? exitVoid;
    }));
    return Yield;
  }
});
var asyncFinalizer = /* @__PURE__ */ makePrimitive({
  op: "AsyncFinalizer",
  [contAll](fiber2) {
    if (fiber2.interruptible) {
      fiber2.interruptible = false;
      fiber2._stack.push(setInterruptibleTrue);
    }
  },
  [contE](cause, _fiber) {
    return hasInterrupts(cause) ? flatMap(this[args](), () => failCause(cause)) : failCause(cause);
  }
});
var callback = (register) => callbackOptions(register, register.length >= 2);
var never = /* @__PURE__ */ callback(constVoid);
var gen = (...args2) => suspend(() => fromIteratorUnsafe(args2.length === 1 ? args2[0]() : args2[1].call(args2[0].self)));
var fnUntraced = (body, ...pipeables) => {
  const fn = pipeables.length === 0 ? function() {
    return suspend(() => fromIteratorUnsafe(body.apply(this, arguments)));
  } : function() {
    let effect = suspend(() => fromIteratorUnsafe(body.apply(this, arguments)));
    for (let i = 0;i < pipeables.length; i++) {
      effect = pipeables[i](effect, ...arguments);
    }
    return effect;
  };
  return defineFunctionLength(body.length, fn);
};
var defineFunctionLength = (length, fn) => Object.defineProperty(fn, "length", {
  value: length,
  configurable: true
});
var fnStackCleaner = /* @__PURE__ */ makeStackCleaner(2);
var fn = function() {
  const nameFirst = typeof arguments[0] === "string";
  const name = nameFirst ? arguments[0] : "Effect.fn";
  const spanOptions = nameFirst ? arguments[1] : undefined;
  const prevLimit = globalThis.Error.stackTraceLimit;
  globalThis.Error.stackTraceLimit = 2;
  const defError = new globalThis.Error;
  globalThis.Error.stackTraceLimit = prevLimit;
  if (nameFirst) {
    return (body, ...pipeables) => makeFn(name, body, defError, pipeables, nameFirst, spanOptions);
  }
  return makeFn(name, arguments[0], defError, Array.prototype.slice.call(arguments, 1), nameFirst, spanOptions);
};
var makeFn = (name, bodyOrOptions, defError, pipeables, addSpan, spanOptions) => {
  const body = typeof bodyOrOptions === "function" ? bodyOrOptions : pipeables.pop().bind(bodyOrOptions.self);
  return defineFunctionLength(body.length, function(...args2) {
    let result = suspend(() => {
      const iter = body.apply(this, arguments);
      return isEffect(iter) ? iter : fromIteratorUnsafe(iter);
    });
    for (let i = 0;i < pipeables.length; i++) {
      result = pipeables[i](result, ...args2);
    }
    if (!isEffect(result)) {
      return result;
    }
    const prevLimit = globalThis.Error.stackTraceLimit;
    globalThis.Error.stackTraceLimit = 2;
    const callError = new globalThis.Error;
    globalThis.Error.stackTraceLimit = prevLimit;
    return updateService(addSpan ? useSpan(name, spanOptions, (span) => provideParentSpan(result, span)) : result, CurrentStackFrame, (prev) => ({
      name,
      stack: fnStackCleaner(() => callError.stack),
      parent: {
        name: `${name} (definition)`,
        stack: fnStackCleaner(() => defError.stack),
        parent: prev
      }
    }));
  });
};
var fnUntracedEager = (body, ...pipeables) => defineFunctionLength(body.length, pipeables.length === 0 ? function() {
  return fromIteratorEagerUnsafe(() => body.apply(this, arguments));
} : function() {
  let effect = fromIteratorEagerUnsafe(() => body.apply(this, arguments));
  for (const pipeable of pipeables) {
    effect = pipeable(effect);
  }
  return effect;
});
var fromIteratorEagerUnsafe = (evaluate2) => {
  try {
    const iterator = evaluate2();
    let value = undefined;
    while (true) {
      const state = iterator.next(value);
      if (state.done) {
        return succeed3(state.value);
      }
      const primitive = state.value;
      if (primitive && primitive._tag === "Success") {
        value = primitive.value;
        continue;
      } else if (primitive && primitive._tag === "Failure") {
        return state.value;
      } else {
        let isFirstExecution = true;
        return suspend(() => {
          if (isFirstExecution) {
            isFirstExecution = false;
            return flatMap(state.value, (value2) => fromIteratorUnsafe(iterator, value2));
          } else {
            return suspend(() => fromIteratorUnsafe(evaluate2()));
          }
        });
      }
    }
  } catch (error) {
    return die(error);
  }
};
var fromIteratorUnsafe = /* @__PURE__ */ makePrimitive({
  op: "Iterator",
  single: false,
  [contA](value, fiber2) {
    const iter = this[args][0];
    while (true) {
      const state = iter.next(value);
      if (state.done)
        return succeed3(state.value);
      if (!effectIsExit(state.value)) {
        fiber2._stack.push(this);
        return state.value;
      } else if (state.value._tag === "Failure") {
        return state.value;
      }
      value = state.value.value;
    }
  },
  [evaluate](fiber2) {
    return this[contA](this[args][1], fiber2);
  }
});
var as = /* @__PURE__ */ dual(2, (self, value) => {
  const b = succeed3(value);
  return flatMap(self, (_) => b);
});
var asSome = (self) => map4(self, some2);
var flip = (self) => matchEffect(self, {
  onFailure: succeed3,
  onSuccess: fail3
});
var andThen = /* @__PURE__ */ dual(2, (self, f) => flatMap(self, (a) => isEffect(f) ? f : internalCall(() => f(a))));
var tap = /* @__PURE__ */ dual(2, (self, f) => flatMap(self, (a) => as(isEffect(f) ? f : internalCall(() => f(a)), a)));
var asVoid = (self) => flatMap(self, (_) => exitVoid);
var sandbox = (self) => catchCause(self, fail3);
var raceAll = (all, options) => withFiber((parent) => callback((resume) => {
  const effects = fromIterable(all);
  const len = effects.length;
  let doneCount = 0;
  let done2 = false;
  const fibers = new Set;
  const failures = [];
  const onExit = (exit, fiber2, i) => {
    doneCount++;
    if (exit._tag === "Failure") {
      failures.push(...exit.cause.reasons);
      if (doneCount >= len) {
        resume(failCause(causeFromReasons(failures)));
      }
      return;
    }
    const isWinner = !done2;
    done2 = true;
    resume(fibers.size === 0 ? exit : flatMap(uninterruptible(fiberInterruptAll(fibers)), () => exit));
    if (isWinner && options?.onWinner) {
      options.onWinner({
        fiber: fiber2,
        index: i,
        parentFiber: parent
      });
    }
  };
  for (let i = 0;i < len; i++) {
    const fiber2 = forkUnsafe(parent, effects[i], true, true, false);
    fibers.add(fiber2);
    fiber2.addObserver((exit) => {
      fibers.delete(fiber2);
      onExit(exit, fiber2, i);
    });
    if (done2)
      break;
  }
  return fiberInterruptAll(fibers);
}));
var raceAllFirst = (all, options) => withFiber((parent) => callback((resume) => {
  let done2 = false;
  const fibers = new Set;
  const onExit = (exit) => {
    done2 = true;
    resume(fibers.size === 0 ? exit : flatMap(uninterruptible(fiberInterruptAll(fibers)), () => exit));
  };
  let i = 0;
  for (const effect of all) {
    if (done2)
      break;
    const index = i++;
    const fiber2 = forkUnsafe(parent, effect, true, true, false);
    fibers.add(fiber2);
    fiber2.addObserver((exit) => {
      fibers.delete(fiber2);
      const isWinner = !done2;
      onExit(exit);
      if (isWinner && options?.onWinner) {
        options.onWinner({
          fiber: fiber2,
          index,
          parentFiber: parent
        });
      }
    });
  }
  return fiberInterruptAll(fibers);
}));
var race = /* @__PURE__ */ dual((args2) => isEffect(args2[1]), (self, that, options) => raceAll([self, that], options));
var raceFirst = /* @__PURE__ */ dual((args2) => isEffect(args2[1]), (self, that, options) => raceAllFirst([self, that], options));
var flatMap = /* @__PURE__ */ dual(2, (self, f) => {
  const onSuccess = Object.create(OnSuccessProto);
  onSuccess[args] = self;
  onSuccess[contA] = f.length !== 1 ? (a) => f(a) : f;
  return onSuccess;
});
var OnSuccessProto = /* @__PURE__ */ makePrimitiveProto({
  op: "OnSuccess",
  [evaluate](fiber2) {
    fiber2._stack.push(this);
    return this[args];
  }
});
var matchCauseEffectEager = /* @__PURE__ */ dual(2, (self, options) => {
  if (effectIsExit(self)) {
    return self._tag === "Success" ? options.onSuccess(self.value) : options.onFailure(self.cause);
  }
  return matchCauseEffect(self, options);
});
var effectIsExit = (effect) => (ExitTypeId in effect);
var flatMapEager = /* @__PURE__ */ dual(2, (self, f) => {
  if (effectIsExit(self)) {
    return self._tag === "Success" ? f(self.value) : self;
  }
  return flatMap(self, f);
});
var flatten = (self) => flatMap(self, identity);
var map4 = /* @__PURE__ */ dual(2, (self, f) => flatMap(self, (a) => succeed3(internalCall(() => f(a)))));
var mapEager = /* @__PURE__ */ dual(2, (self, f) => effectIsExit(self) ? exitMap(self, f) : map4(self, f));
var mapErrorEager = /* @__PURE__ */ dual(2, (self, f) => effectIsExit(self) ? exitMapError(self, f) : mapError2(self, f));
var mapBothEager = /* @__PURE__ */ dual(2, (self, options) => effectIsExit(self) ? exitMapBoth(self, options) : mapBoth(self, options));
var catchEager = /* @__PURE__ */ dual(2, (self, f) => {
  if (effectIsExit(self)) {
    if (self._tag === "Success")
      return self;
    const error = findError(self.cause);
    if (isFailure2(error))
      return self;
    return f(error.success);
  }
  return catch_(self, f);
});
var exitIsSuccess = (self) => self._tag === "Success";
var exitFilterCause = (self) => self._tag === "Failure" ? succeed2(self.cause) : fail2(self);
var exitVoid = /* @__PURE__ */ exitSucceed(undefined);
var exitMap = /* @__PURE__ */ dual(2, (self, f) => self._tag === "Success" ? exitSucceed(f(self.value)) : self);
var exitMapError = /* @__PURE__ */ dual(2, (self, f) => {
  if (self._tag === "Success")
    return self;
  const error = findError(self.cause);
  if (isFailure2(error))
    return self;
  return exitFail(f(error.success));
});
var exitMapBoth = /* @__PURE__ */ dual(2, (self, options) => {
  if (self._tag === "Success")
    return exitSucceed(options.onSuccess(self.value));
  const error = findError(self.cause);
  if (isFailure2(error))
    return self;
  return exitFail(options.onFailure(error.success));
});
var exitAsVoidAll = (exits) => {
  const failures = [];
  for (const exit of exits) {
    if (exit._tag === "Failure") {
      failures.push(...exit.cause.reasons);
    }
  }
  return failures.length === 0 ? exitVoid : exitFailCause(causeFromReasons(failures));
};
var exitGetSuccess = (self) => exitIsSuccess(self) ? some2(self.value) : none2();
var service = (service2) => service2;
var serviceOption = (service2) => withFiber((fiber2) => succeed3(getOption(fiber2.context, service2)));
var serviceOptional = (service2) => withFiber((fiber2) => fiber2.context.mapUnsafe.has(service2.key) ? succeed3(getUnsafe(fiber2.context, service2)) : fail3(new NoSuchElementError));
var updateContext = /* @__PURE__ */ dual(2, (self, f) => withFiber((fiber2) => {
  const prevContext = fiber2.context;
  const nextContext = f(prevContext);
  if (prevContext === nextContext)
    return self;
  fiber2.setContext(nextContext);
  return onExitPrimitive(self, () => {
    fiber2.setContext(prevContext);
    return;
  });
}));
var updateService = /* @__PURE__ */ dual(3, (self, service2, f) => updateContext(self, (s) => {
  const prev = getUnsafe(s, service2);
  const next = f(prev);
  if (prev === next)
    return s;
  return add(s, service2, next);
}));
var context = () => getContext;
var getContext = /* @__PURE__ */ withFiber((fiber2) => succeed3(fiber2.context));
var contextWith = (f) => withFiber((fiber2) => f(fiber2.context));
var provideContext = /* @__PURE__ */ dual(2, (self, context2) => {
  if (effectIsExit(self))
    return self;
  return updateContext(self, merge(context2));
});
var provideService = function() {
  if (arguments.length === 1) {
    return dual(2, (self, impl) => provideServiceImpl(self, arguments[0], impl));
  }
  return dual(3, (self, service2, impl) => provideServiceImpl(self, service2, impl)).apply(this, arguments);
};
var provideServiceImpl = (self, service2, implementation) => updateContext(self, (s) => {
  const prev = s.mapUnsafe.get(service2.key);
  if (prev === implementation)
    return s;
  return add(s, service2, implementation);
});
var provideServiceEffect = /* @__PURE__ */ dual(3, (self, service2, acquire) => flatMap(acquire, (implementation) => provideService(self, service2, implementation)));
var withConcurrency = /* @__PURE__ */ provideService(CurrentConcurrency);
var zip = /* @__PURE__ */ dual((args2) => isEffect(args2[1]), (self, that, options) => zipWith(self, that, (a, a2) => [a, a2], options));
var zipWith = /* @__PURE__ */ dual((args2) => isEffect(args2[1]), (self, that, f, options) => options?.concurrent ? map4(all([self, that], {
  concurrency: 2
}), ([a, a2]) => internalCall(() => f(a, a2))) : flatMap(self, (a) => map4(that, (a2) => internalCall(() => f(a, a2)))));
var filterOrFail = /* @__PURE__ */ dual((args2) => isEffect(args2[0]), (self, predicate, orFailWith) => filterOrElse(self, predicate, orFailWith ? (a) => fail3(orFailWith(a)) : () => fail3(new NoSuchElementError)));
var when = /* @__PURE__ */ dual(2, (self, condition) => flatMap(condition, (pass) => pass ? asSome(self) : succeedNone));
var replicate = /* @__PURE__ */ dual(2, (self, n) => Array.from({
  length: n
}, () => self));
var replicateEffect = /* @__PURE__ */ dual((args2) => isEffect(args2[0]), (self, n, options) => all(replicate(self, n), options));
var forever = /* @__PURE__ */ dual((args2) => isEffect(args2[0]), (self, options) => whileLoop({
  while: constTrue,
  body: constant(options?.disableYield ? self : flatMap(self, (_) => yieldNow)),
  step: constVoid
}));
var catchCause = /* @__PURE__ */ dual(2, (self, f) => {
  const onFailure = Object.create(OnFailureProto);
  onFailure[args] = self;
  onFailure[contE] = f.length !== 1 ? (cause) => f(cause) : f;
  return onFailure;
});
var OnFailureProto = /* @__PURE__ */ makePrimitiveProto({
  op: "OnFailure",
  [evaluate](fiber2) {
    fiber2._stack.push(this);
    return this[args];
  }
});
var catchCauseIf = /* @__PURE__ */ dual(3, (self, predicate, f) => catchCause(self, (cause) => {
  if (!predicate(cause)) {
    return failCause(cause);
  }
  return internalCall(() => f(cause));
}));
var catchCauseFilter = /* @__PURE__ */ dual(3, (self, filter4, f) => catchCause(self, (cause) => {
  const eb = filter4(cause);
  return isFailure2(eb) ? failCause(eb.failure) : internalCall(() => f(eb.success, cause));
}));
var catch_ = /* @__PURE__ */ dual(2, (self, f) => catchCauseFilter(self, findError, (e) => f(e)));
var catchNoSuchElement = (self) => matchEffect(self, {
  onFailure: (error) => isNoSuchElementError(error) ? succeedNone : fail3(error),
  onSuccess: succeedSome
});
var catchDefect = /* @__PURE__ */ dual(2, (self, f) => catchCauseFilter(self, findDefect, f));
var tapCause = /* @__PURE__ */ dual(2, (self, f) => catchCause(self, (cause) => andThen(internalCall(() => f(cause)), failCause(cause))));
var tapCauseIf = /* @__PURE__ */ dual(3, (self, predicate, f) => catchCauseIf(self, predicate, (cause) => andThen(internalCall(() => f(cause)), failCause(cause))));
var tapCauseFilter = /* @__PURE__ */ dual(3, (self, filter4, f) => catchCause(self, (cause) => {
  const result = filter4(cause);
  if (isFailure2(result)) {
    return failCause(cause);
  }
  return andThen(internalCall(() => f(result.success, cause)), failCause(cause));
}));
var tapError = /* @__PURE__ */ dual(2, (self, f) => tapCauseFilter(self, findError, (e) => f(e)));
var tapErrorTag = /* @__PURE__ */ dual(3, (self, k, f) => {
  const predicate = Array.isArray(k) ? (e) => hasProperty(e, "_tag") && k.includes(e._tag) : isTagged(k);
  return tapError(self, (error) => predicate(error) ? f(error) : void_);
});
var tapDefect = /* @__PURE__ */ dual(2, (self, f) => tapCauseFilter(self, findDefect, (_) => f(_)));
var catchIf = /* @__PURE__ */ dual((args2) => isEffect(args2[0]), (self, predicate, f, orElse) => catchCause(self, (cause) => {
  const error = findError(cause);
  if (isFailure2(error))
    return failCause(error.failure);
  if (!predicate(error.success)) {
    return orElse ? internalCall(() => orElse(error.success)) : failCause(cause);
  }
  return internalCall(() => f(error.success));
}));
var catchFilter = /* @__PURE__ */ dual((args2) => isEffect(args2[0]), (self, filter4, f, orElse) => catchCause(self, (cause) => {
  const error = findError(cause);
  if (isFailure2(error))
    return failCause(error.failure);
  const result = filter4(error.success);
  if (isFailure2(result)) {
    return orElse ? internalCall(() => orElse(result.failure)) : failCause(cause);
  }
  return internalCall(() => f(result.success));
}));
var catchTag = /* @__PURE__ */ dual((args2) => isEffect(args2[0]), (self, k, f, orElse) => {
  const pred = Array.isArray(k) ? (e) => hasProperty(e, "_tag") && k.includes(e._tag) : isTagged(k);
  return catchIf(self, pred, f, orElse);
});
var catchTags = /* @__PURE__ */ dual((args2) => isEffect(args2[0]), (self, cases, orElse) => {
  let keys2;
  return catchFilter(self, (e) => {
    keys2 ??= Object.keys(cases);
    return hasProperty(e, "_tag") && isString(e["_tag"]) && keys2.includes(e["_tag"]) ? succeed2(e) : fail2(e);
  }, (e) => internalCall(() => cases[e["_tag"]](e)), orElse);
});
var catchReason = /* @__PURE__ */ dual((args2) => isEffect(args2[0]), (self, errorTag, reasonTag, f, orElse) => catchIf(self, (e) => isTagged(e, errorTag) && hasProperty(e, "reason"), (e) => {
  const reason = e.reason;
  if (isTagged(reason, reasonTag))
    return f(reason, e);
  return orElse ? internalCall(() => orElse(reason, e)) : fail3(e);
}));
var catchReasons = /* @__PURE__ */ dual((args2) => isEffect(args2[0]), (self, errorTag, cases, orElse) => {
  let keys2;
  return catchIf(self, (e) => isTagged(e, errorTag) && hasProperty(e, "reason") && hasProperty(e.reason, "_tag") && isString(e.reason._tag), (e) => {
    const reason = e.reason;
    keys2 ??= Object.keys(cases);
    if (keys2.includes(reason._tag)) {
      return internalCall(() => cases[reason._tag](reason, e));
    }
    return orElse ? internalCall(() => orElse(reason, e)) : fail3(e);
  });
});
var unwrapReason = /* @__PURE__ */ dual(2, (self, errorTag) => catchFilter(self, (e) => {
  if (isTagged(e, errorTag) && hasProperty(e, "reason")) {
    return succeed2(e.reason);
  }
  return fail2(e);
}, fail3));
var mapError2 = /* @__PURE__ */ dual(2, (self, f) => catch_(self, (error) => failSync(() => f(error))));
var mapBoth = /* @__PURE__ */ dual(2, (self, options) => matchEffect(self, {
  onFailure: (e) => failSync(() => options.onFailure(e)),
  onSuccess: (a) => sync(() => options.onSuccess(a))
}));
var orDie = (self) => catch_(self, die);
var orElseSucceed = /* @__PURE__ */ dual(2, (self, f) => catch_(self, (_) => sync(f)));
var firstSuccessOf = (effects) => suspend(() => {
  const iterator = effects[Symbol.iterator]();
  let state = iterator.next();
  if (state.done) {
    return die(new Error("Received an empty collection of effects"));
  }
  function loop(current) {
    const next = iterator.next();
    if (next.done)
      return current.value;
    return catch_(current.value, (_) => loop(next));
  }
  return loop(state);
});
var eventually = (self) => catch_(self, (_) => flatMap(yieldNow, () => eventually(self)));
var ignore = /* @__PURE__ */ dual((args2) => isEffect(args2[0]), (self, options) => {
  if (!options?.log) {
    return matchEffect(self, {
      onFailure: (_) => void_,
      onSuccess: (_) => void_
    });
  }
  const logEffect = logWithLevel(options.log === true ? undefined : options.log);
  return matchCauseEffect(self, {
    onFailure(cause) {
      const failure = findFail(cause);
      return isFailure2(failure) ? failCause(failure.failure) : options.message === undefined ? logEffect(cause) : logEffect(options.message, cause);
    },
    onSuccess: (_) => void_
  });
});
var ignoreCause = /* @__PURE__ */ dual((args2) => isEffect(args2[0]), (self, options) => {
  if (!options?.log) {
    return matchCauseEffect(self, {
      onFailure: (_) => void_,
      onSuccess: (_) => void_
    });
  }
  const logEffect = logWithLevel(options.log === true ? undefined : options.log);
  return matchCauseEffect(self, {
    onFailure: (cause) => options.message === undefined ? logEffect(cause) : logEffect(options.message, cause),
    onSuccess: (_) => void_
  });
});
var option = (self) => match4(self, {
  onFailure: none2,
  onSuccess: some2
});
var result = (self) => matchEager(self, {
  onFailure: fail2,
  onSuccess: succeed2
});
var matchCauseEffect = /* @__PURE__ */ dual(2, (self, options) => {
  const primitive = Object.create(OnSuccessAndFailureProto);
  primitive[args] = self;
  primitive[contA] = options.onSuccess.length !== 1 ? (a) => options.onSuccess(a) : options.onSuccess;
  primitive[contE] = options.onFailure.length !== 1 ? (cause) => options.onFailure(cause) : options.onFailure;
  return primitive;
});
var OnSuccessAndFailureProto = /* @__PURE__ */ makePrimitiveProto({
  op: "OnSuccessAndFailure",
  [evaluate](fiber2) {
    fiber2._stack.push(this);
    return this[args];
  }
});
var matchCause = /* @__PURE__ */ dual(2, (self, options) => matchCauseEffect(self, {
  onFailure: (cause) => sync(() => options.onFailure(cause)),
  onSuccess: (value) => sync(() => options.onSuccess(value))
}));
var matchEffect = /* @__PURE__ */ dual(2, (self, options) => matchCauseEffect(self, {
  onFailure: (cause) => {
    const fail4 = cause.reasons.find(isFailReason);
    return fail4 ? internalCall(() => options.onFailure(fail4.error)) : failCause(cause);
  },
  onSuccess: options.onSuccess
}));
var match4 = /* @__PURE__ */ dual(2, (self, options) => matchEffect(self, {
  onFailure: (error) => sync(() => options.onFailure(error)),
  onSuccess: (value) => sync(() => options.onSuccess(value))
}));
var matchEager = /* @__PURE__ */ dual(2, (self, options) => {
  if (effectIsExit(self)) {
    if (self._tag === "Success")
      return exitSucceed(options.onSuccess(self.value));
    const error = findError(self.cause);
    if (isFailure2(error))
      return self;
    return exitSucceed(options.onFailure(error.success));
  }
  return match4(self, options);
});
var matchCauseEager = /* @__PURE__ */ dual(2, (self, options) => {
  if (effectIsExit(self)) {
    if (self._tag === "Success")
      return exitSucceed(options.onSuccess(self.value));
    return exitSucceed(options.onFailure(self.cause));
  }
  return matchCause(self, options);
});
var exit = (self) => effectIsExit(self) ? exitSucceed(self) : exitPrimitive(self);
var exitPrimitive = /* @__PURE__ */ makePrimitive({
  op: "Exit",
  [evaluate](fiber2) {
    fiber2._stack.push(this);
    return this[args];
  },
  [contA](value, _, exit2) {
    return succeed3(exit2 ?? exitSucceed(value));
  },
  [contE](cause, _, exit2) {
    return succeed3(exit2 ?? exitFailCause(cause));
  }
});
var isFailure3 = /* @__PURE__ */ matchEager({
  onFailure: () => true,
  onSuccess: () => false
});
var isSuccess3 = /* @__PURE__ */ matchEager({
  onFailure: () => false,
  onSuccess: () => true
});
var delay = /* @__PURE__ */ dual(2, (self, duration) => andThen(sleep(duration), self));
var timeoutOrElse = /* @__PURE__ */ dual(2, (self, options) => raceFirst(self, flatMap(sleep(options.duration), options.orElse)));
var timeout = /* @__PURE__ */ dual(2, (self, duration) => timeoutOrElse(self, {
  duration,
  orElse: () => fail3(new TimeoutError)
}));
var timeoutOption = /* @__PURE__ */ dual(2, (self, duration) => raceFirst(asSome(self), as(sleep(duration), none2())));
var timed = (self) => clockWith((clock) => {
  const start = clock.currentTimeNanosUnsafe();
  return map4(self, (a) => [nanos(clock.currentTimeNanosUnsafe() - start), a]);
});
var ScopeTypeId = "~effect/Scope";
var ScopeCloseableTypeId = "~effect/Scope/Closeable";
var scopeTag = /* @__PURE__ */ Service("effect/Scope");
var scopeClose = (self, exit_) => suspend(() => scopeCloseUnsafe(self, exit_) ?? void_);
var scopeCloseUnsafe = (self, exit_) => {
  if (self.state._tag === "Closed")
    return;
  const closed = {
    _tag: "Closed",
    exit: exit_
  };
  if (self.state._tag === "Empty") {
    self.state = closed;
    return;
  }
  const {
    finalizers
  } = self.state;
  self.state = closed;
  if (finalizers.size === 0) {
    return;
  } else if (finalizers.size === 1) {
    return finalizers.values().next().value(exit_);
  }
  return scopeCloseFinalizers(self, finalizers, exit_);
};
var scopeCloseFinalizers = /* @__PURE__ */ fnUntraced(function* (self, finalizers, exit_) {
  let exits = [];
  const fibers = [];
  const arr = Array.from(finalizers.values());
  const parent = getCurrentFiber();
  for (let i = arr.length - 1;i >= 0; i--) {
    const finalizer = arr[i];
    if (self.strategy === "sequential") {
      exits.push(yield* exit(finalizer(exit_)));
    } else {
      fibers.push(forkUnsafe(parent, finalizer(exit_), true, true, "inherit"));
    }
  }
  if (fibers.length > 0) {
    exits = yield* fiberAwaitAll(fibers);
  }
  return yield* exitAsVoidAll(exits);
});
var scopeForkUnsafe = (scope, finalizerStrategy) => {
  const newScope = scopeMakeUnsafe(finalizerStrategy);
  if (scope.state._tag === "Closed") {
    newScope.state = scope.state;
    return newScope;
  }
  const key = {};
  scopeAddFinalizerUnsafe(scope, key, (exit2) => scopeClose(newScope, exit2));
  scopeAddFinalizerUnsafe(newScope, key, (_) => sync(() => scopeRemoveFinalizerUnsafe(scope, key)));
  return newScope;
};
var scopeAddFinalizerExit = (scope, finalizer) => {
  return suspend(() => {
    if (scope.state._tag === "Closed") {
      return finalizer(scope.state.exit);
    }
    scopeAddFinalizerUnsafe(scope, {}, finalizer);
    return void_;
  });
};
var scopeAddFinalizer = (scope, finalizer) => scopeAddFinalizerExit(scope, constant(finalizer));
var scopeAddFinalizerUnsafe = (scope, key, finalizer) => {
  if (scope.state._tag === "Empty") {
    scope.state = {
      _tag: "Open",
      finalizers: new Map([[key, finalizer]])
    };
  } else if (scope.state._tag === "Open") {
    scope.state.finalizers.set(key, finalizer);
  }
};
var scopeRemoveFinalizerUnsafe = (scope, key) => {
  if (scope.state._tag === "Open") {
    scope.state.finalizers.delete(key);
  }
};
var scopeMakeUnsafe = (finalizerStrategy = "sequential") => ({
  [ScopeCloseableTypeId]: ScopeCloseableTypeId,
  [ScopeTypeId]: ScopeTypeId,
  strategy: finalizerStrategy,
  state: constScopeEmpty
});
var constScopeEmpty = {
  _tag: "Empty"
};
var scope = scopeTag;
var provideScope = /* @__PURE__ */ provideService(scopeTag);
var scoped = (self) => withFiber((fiber2) => {
  const prev = fiber2.context;
  const scope2 = scopeMakeUnsafe();
  fiber2.setContext(add(fiber2.context, scopeTag, scope2));
  return onExitPrimitive(self, (exit2) => {
    fiber2.setContext(prev);
    return scopeCloseUnsafe(scope2, exit2);
  });
});
var scopedWith = (f) => suspend(() => {
  const scope2 = scopeMakeUnsafe();
  return onExit(f(scope2), (exit2) => suspend(() => scopeCloseUnsafe(scope2, exit2) ?? void_));
});
var acquireRelease = (acquire, release, options) => contextWith((context2) => uninterruptibleMask((restore) => flatMap(scope, (scope2) => tap(options?.interruptible ? restore(acquire) : acquire, (a) => scopeAddFinalizerExit(scope2, (exit2) => provideContext(release(a, exit2), context2))))));
var addFinalizer = (finalizer) => flatMap(scope, (scope2) => contextWith((context2) => scopeAddFinalizerExit(scope2, (exit2) => provideContext(finalizer(exit2), context2))));
var onExitPrimitive = /* @__PURE__ */ makePrimitive({
  op: "OnExit",
  single: false,
  [evaluate](fiber2) {
    fiber2._stack.push(this);
    return this[args][0];
  },
  [contAll](fiber2) {
    if (fiber2.interruptible && this[args][2] !== true) {
      fiber2._stack.push(setInterruptibleTrue);
      fiber2.interruptible = false;
    }
  },
  [contA](value, _, exit2) {
    exit2 ??= exitSucceed(value);
    const eff = this[args][1](exit2);
    return eff ? flatMap(eff, (_2) => exit2) : exit2;
  },
  [contE](cause, _, exit2) {
    exit2 ??= exitFailCause(cause);
    const eff = this[args][1](exit2);
    return eff ? flatMap(eff, (_2) => exit2) : exit2;
  }
});
var onExit = /* @__PURE__ */ dual(2, onExitPrimitive);
var ensuring = /* @__PURE__ */ dual(2, (self, finalizer) => onExit(self, (_) => finalizer));
var onExitIf = /* @__PURE__ */ dual(3, (self, predicate, f) => onExit(self, (exit2) => {
  if (!predicate(exit2)) {
    return void_;
  }
  return f(exit2);
}));
var onExitFilter = /* @__PURE__ */ dual(3, (self, filter4, f) => onExit(self, (exit2) => {
  const b = filter4(exit2);
  return isFailure2(b) ? void_ : f(b.success, exit2);
}));
var onError = /* @__PURE__ */ dual(2, (self, f) => onExitFilter(self, exitFilterCause, f));
var onErrorIf = /* @__PURE__ */ dual(3, (self, predicate, f) => onExitIf(self, (exit2) => {
  if (exit2._tag !== "Failure") {
    return false;
  }
  return predicate(exit2.cause);
}, (exit2) => f(exit2.cause)));
var onErrorFilter = /* @__PURE__ */ dual(3, (self, filter4, f) => onExit(self, (exit2) => {
  if (exit2._tag !== "Failure") {
    return void_;
  }
  const result2 = filter4(exit2.cause);
  return isFailure2(result2) ? void_ : f(result2.success, exit2.cause);
}));
var onInterrupt = /* @__PURE__ */ dual(2, (self, finalizer) => onErrorFilter(causeFilterInterruptors, finalizer)(self));
var acquireUseRelease = (acquire, use, release) => uninterruptibleMask((restore) => flatMap(acquire, (a) => onExitPrimitive(restore(use(a)), (exit2) => release(a, exit2), true)));
var acquireDisposable = (acquire) => acquireRelease(acquire, (resource) => hasProperty(resource, Symbol.asyncDispose) ? promise(() => resource[Symbol.asyncDispose]()) : sync(() => resource[Symbol.dispose]()));
var cachedInvalidateWithTTL = /* @__PURE__ */ dual(2, (self, ttl) => sync(() => {
  const ttlMillis = toMillis(fromInputUnsafe(ttl));
  const isFinite2 = Number.isFinite(ttlMillis);
  const latch = makeLatchUnsafe(false);
  let expiresAt = 0;
  let running = false;
  let exit2;
  const wait = flatMap(latch.await, () => exit2);
  return [withFiber((fiber2) => {
    const clock = fiber2.getRef(ClockRef);
    const now = isFinite2 ? clock.currentTimeMillisUnsafe() : 0;
    if (running || now < expiresAt)
      return exit2 ?? wait;
    running = true;
    latch.closeUnsafe();
    exit2 = undefined;
    return onExit(self, (exit_) => sync(() => {
      running = false;
      expiresAt = clock.currentTimeMillisUnsafe() + ttlMillis;
      exit2 = exit_;
      latch.openUnsafe();
    }));
  }), sync(() => {
    expiresAt = 0;
    latch.closeUnsafe();
    exit2 = undefined;
  })];
}));
var cachedWithTTL = /* @__PURE__ */ dual(2, (self, timeToLive) => map4(cachedInvalidateWithTTL(self, timeToLive), (tuple) => tuple[0]));
var cached = (self) => cachedWithTTL(self, infinity);
var interrupt = /* @__PURE__ */ withFiber((fiber2) => failCause(causeInterrupt(fiber2.id)));
var uninterruptible = (self) => withFiber((fiber2) => {
  if (!fiber2.interruptible)
    return self;
  fiber2.interruptible = false;
  fiber2._stack.push(setInterruptibleTrue);
  return self;
});
var setInterruptible = /* @__PURE__ */ makePrimitive({
  op: "SetInterruptible",
  [contAll](fiber2) {
    fiber2.interruptible = this[args];
    if (fiber2._interruptedCause && fiber2.interruptible) {
      return () => failCause(fiber2._interruptedCause);
    }
  }
});
var setInterruptibleTrue = /* @__PURE__ */ setInterruptible(true);
var setInterruptibleFalse = /* @__PURE__ */ setInterruptible(false);
var interruptible = (self) => withFiber((fiber2) => {
  if (fiber2.interruptible)
    return self;
  fiber2.interruptible = true;
  fiber2._stack.push(setInterruptibleFalse);
  if (fiber2._interruptedCause)
    return failCause(fiber2._interruptedCause);
  return self;
});
var uninterruptibleMask = (f) => withFiber((fiber2) => {
  if (!fiber2.interruptible)
    return f(identity);
  fiber2.interruptible = false;
  fiber2._stack.push(setInterruptibleTrue);
  return f(interruptible);
});
var interruptibleMask = (f) => withFiber((fiber2) => {
  if (fiber2.interruptible)
    return f(identity);
  fiber2.interruptible = true;
  fiber2._stack.push(setInterruptibleFalse);
  return f(uninterruptible);
});
var abortSignal = /* @__PURE__ */ map4(/* @__PURE__ */ acquireRelease(/* @__PURE__ */ sync(() => new AbortController), (controller) => sync(() => controller.abort())), (_) => _.signal);
var all = (arg, options) => {
  if (isIterable(arg)) {
    return options?.mode === "result" ? forEach(arg, result, options) : forEach(arg, identity, options);
  } else if (options?.discard) {
    return options.mode === "result" ? forEach(Object.values(arg), result, options) : forEach(Object.values(arg), identity, options);
  }
  return suspend(() => {
    const out = {};
    return as(forEach(Object.entries(arg), ([key, effect]) => map4(options?.mode === "result" ? result(effect) : effect, (value) => {
      out[key] = value;
    }), {
      discard: true,
      concurrency: options?.concurrency
    }), out);
  });
};
var partition2 = /* @__PURE__ */ dual((args2) => isIterable(args2[0]) && !isEffect(args2[0]), (elements, f, options) => map4(forEach(elements, (a, i) => result(f(a, i)), options), (results) => partition(results, identity)));
var validate = /* @__PURE__ */ dual((args2) => isIterable(args2[0]) && !isEffect(args2[0]), (elements, f, options) => flatMap(partition2(elements, f, {
  concurrency: options?.concurrency
}), ([excluded, satisfying]) => {
  if (isArrayNonEmpty2(excluded)) {
    return fail3(excluded);
  }
  return options?.discard ? void_ : succeed3(satisfying);
}));
var findFirst = /* @__PURE__ */ dual((args2) => isIterable(args2[0]) && !isEffect(args2[0]), (elements, predicate) => suspend(() => {
  const iterator = elements[Symbol.iterator]();
  const next = iterator.next();
  if (!next.done) {
    return findFirstLoop(iterator, 0, predicate, next.value);
  }
  return succeed3(none2());
}));
var findFirstLoop = (iterator, index, predicate, value) => flatMap(predicate(value, index), (keep) => {
  if (keep) {
    return succeed3(some2(value));
  }
  const next = iterator.next();
  if (!next.done) {
    return findFirstLoop(iterator, index + 1, predicate, next.value);
  }
  return succeed3(none2());
});
var findFirstFilter = /* @__PURE__ */ dual((args2) => isIterable(args2[0]) && !isEffect(args2[0]), (elements, filter4) => suspend(() => {
  const iterator = elements[Symbol.iterator]();
  const next = iterator.next();
  if (!next.done) {
    return findFirstFilterLoop(iterator, 0, filter4, next.value);
  }
  return succeed3(none2());
}));
var findFirstFilterLoop = (iterator, index, filter4, value) => flatMap(filter4(value, index), (result2) => {
  if (isSuccess2(result2)) {
    return succeed3(some2(result2.success));
  }
  const next = iterator.next();
  if (!next.done) {
    return findFirstFilterLoop(iterator, index + 1, filter4, next.value);
  }
  return succeed3(none2());
});
var whileLoop = /* @__PURE__ */ makePrimitive({
  op: "While",
  [contA](value, fiber2) {
    this[args].step(value);
    if (this[args].while()) {
      fiber2._stack.push(this);
      return this[args].body();
    }
    return exitVoid;
  },
  [evaluate](fiber2) {
    if (this[args].while()) {
      fiber2._stack.push(this);
      return this[args].body();
    }
    return exitVoid;
  }
});
var forEach = /* @__PURE__ */ dual((args2) => typeof args2[1] === "function", (iterable, f, options) => withFiber((parent) => {
  const concurrencyOption = options?.concurrency === "inherit" ? parent.getRef(CurrentConcurrency) : options?.concurrency ?? 1;
  const concurrency = concurrencyOption === "unbounded" ? Number.POSITIVE_INFINITY : Math.max(1, concurrencyOption);
  if (concurrency === 1) {
    return forEachSequential(iterable, f, options);
  }
  const items = fromIterable(iterable);
  let length = items.length;
  if (length === 0) {
    return options?.discard ? void_ : succeed3([]);
  }
  const out = options?.discard ? undefined : new Array(length);
  const eff = forEachConcurrent({
    f,
    out
  }, items, {
    concurrency
  });
  return eff ? as(eff, out) : succeed3(out);
}));
var forEachSequential = (iterable, f, options) => suspend(() => {
  const out = options?.discard ? undefined : [];
  const iterator = iterable[Symbol.iterator]();
  let state = iterator.next();
  let index = 0;
  return as(whileLoop({
    while: () => !state.done,
    body: () => f(state.value, index++),
    step: (b) => {
      if (out)
        out.push(b);
      state = iterator.next();
    }
  }), out);
});
var iterateEagerImpl = (options) => {
  const onItem = options.onItem;
  const step = options.step;
  return (state, items, opts) => {
    let index = opts?.start ?? 0;
    const end = opts?.end ?? items.length;
    const concurrency = opts?.concurrency ?? 1;
    let done2 = false;
    let parentFiber;
    let fibers;
    let resume;
    let interrupted = false;
    let terminal;
    let effect;
    const go = () => {
      let paused = false;
      for (;!terminal && index < end; index++) {
        const item = items[index];
        const eff = effect ?? onItem(state, item, index);
        if (effectIsExit(eff)) {
          terminal = step(state, item, eff, index);
          if (terminal)
            break;
        } else if (concurrency === 1) {
          return flatMap(exit(eff), (exit2) => {
            terminal = step(state, item, exit2, index);
            index++;
            return terminal ?? go() ?? void_;
          });
        } else if (!parentFiber) {
          return callback((cb) => {
            parentFiber = getCurrentFiber();
            effect = eff;
            resume = cb;
            const result2 = go();
            if (result2)
              return cb(result2);
            return suspend(() => {
              terminal = exitVoid;
              interrupted = true;
              return fibers ? fiberInterruptAll(fibers) : void_;
            });
          });
        } else {
          effect = undefined;
          const fiber2 = forkUnsafe(parentFiber, eff, true, true, "inherit");
          if (fiber2._exit) {
            terminal = step(state, item, fiber2._exit, index);
            if (terminal)
              break;
            continue;
          }
          if (fibers)
            fibers.add(fiber2);
          else
            fibers = new Set([fiber2]);
          const currentIndex = index;
          fiber2.addObserver((exit2) => {
            fibers.delete(fiber2);
            if (terminal) {
              if (!interrupted && exit2._tag === "Failure") {
                for (const reason of exit2.cause.reasons) {
                  if (reason._tag === "Interrupt")
                    continue;
                  else if (terminal._tag === "Failure") {
                    terminal.cause.reasons.push(reason);
                  } else {
                    terminal = exitFailCause(causeFromReasons([reason]));
                  }
                }
              }
            } else {
              const result2 = step(state, item, exit2, currentIndex);
              if (result2) {
                terminal = result2._tag === "Failure" ? exitFailCause(causeFromReasons(result2.cause.reasons.slice())) : result2;
                go();
              }
            }
            if (paused) {
              const eff2 = go();
              if (eff2)
                resume(eff2);
            } else if (done2 && fibers.size === 0) {
              resume(terminal ?? void_);
            }
          });
          if (fibers.size < concurrency)
            continue;
          paused = true;
          index++;
          return;
        }
      }
      done2 = true;
      if (terminal) {
        if (fibers && fibers.size > 0) {
          const annotations = fiberStackAnnotations(parentFiber);
          fibers.forEach((f) => f.interruptUnsafe(parentFiber.id, annotations));
          return;
        }
        if (resume || terminal._tag === "Failure") {
          return terminal;
        }
      } else if (resume) {
        if (!fibers) {
          return exitVoid;
        } else if (fibers.size === 0) {
          resume(void_);
        }
      }
    };
    return go();
  };
};
var iterateEager = () => iterateEagerImpl;
var forEachConcurrent = /* @__PURE__ */ iterateEagerImpl({
  onItem(state, item, index) {
    return state.f(item, index);
  },
  step(state, _, exit2, index) {
    if (exit2._tag === "Failure")
      return exit2;
    else if (state.out) {
      state.out[index] = exit2.value;
    }
  }
});
var filterOrElse = /* @__PURE__ */ dual(3, (self, predicate, orElse) => flatMap(self, (a) => predicate(a) ? succeed3(a) : orElse(a)));
var filterMapOrElse = /* @__PURE__ */ dual(3, (self, filter4, orElse) => flatMap(self, (a) => {
  const result2 = filter4(a);
  return isFailure2(result2) ? orElse(result2.failure) : succeed3(result2.success);
}));
var filterMapOrFail = /* @__PURE__ */ dual((args2) => isEffect(args2[0]), (self, filter4, orFailWith) => filterMapOrElse(self, filter4, orFailWith ? (x) => fail3(orFailWith(x)) : () => fail3(new NoSuchElementError)));
var filter4 = /* @__PURE__ */ dual((args2) => isIterable(args2[0]) && !isEffect(args2[0]), (elements, predicate, options) => suspend(() => {
  const out = [];
  return as(forEach(elements, (a, i) => {
    const result2 = predicate(a, i);
    if (typeof result2 === "boolean") {
      if (result2)
        out.push(a);
      return void_;
    }
    return map4(result2, (keep) => {
      if (keep) {
        out.push(a);
      }
    });
  }, {
    discard: true,
    concurrency: options?.concurrency
  }), out);
}));
var filterMap = /* @__PURE__ */ dual((args2) => isIterable(args2[0]) && !isEffect(args2[0]), (elements, filter5) => suspend(() => {
  const out = [];
  for (const a of elements) {
    const result2 = filter5(a);
    if (isSuccess2(result2)) {
      out.push(result2.success);
    }
  }
  return succeed3(out);
}));
var filterMapEffect = /* @__PURE__ */ dual((args2) => isIterable(args2[0]) && !isEffect(args2[0]), (elements, filter5, options) => suspend(() => {
  const out = [];
  return as(forEach(elements, (a) => map4(filter5(a), (result2) => {
    if (isSuccess2(result2)) {
      out.push(result2.success);
    }
  }), {
    discard: true,
    concurrency: options?.concurrency
  }), out);
}));
var Do = /* @__PURE__ */ succeed3({});
var bindTo2 = /* @__PURE__ */ bindTo(map4);
var bind2 = /* @__PURE__ */ bind(map4, flatMap);
var let_2 = /* @__PURE__ */ let_(map4);
var forkChild = /* @__PURE__ */ dual((args2) => isEffect(args2[0]), (self, options) => withFiber((fiber2) => {
  interruptChildrenPatch();
  return succeed3(forkUnsafe(fiber2, self, options?.startImmediately, false, options?.uninterruptible ?? false));
}));
var forkUnsafe = (parent, effect, immediate = false, daemon = false, uninterruptible2 = false) => {
  const interruptible2 = uninterruptible2 === "inherit" ? parent.interruptible : !uninterruptible2;
  const child = new FiberImpl(parent.context, interruptible2);
  if (immediate) {
    child.evaluate(effect);
  } else {
    parent.currentDispatcher.scheduleTask(() => child.evaluate(effect), 0);
  }
  if (!daemon && !child._exit) {
    parent.children().add(child);
    child.addObserver(() => parent._children.delete(child));
  }
  return child;
};
var forkDetach = /* @__PURE__ */ dual((args2) => isEffect(args2[0]), (self, options) => withFiber((fiber2) => succeed3(forkUnsafe(fiber2, self, options?.startImmediately, true, options?.uninterruptible))));
var awaitAllChildren = (self) => withFiber((fiber2) => {
  const initialChildren = fiber2._children && fromIterable(fiber2._children);
  return onExit(self, (_) => {
    let children = fiber2._children;
    if (children === undefined || children.size === 0) {
      return void_;
    } else if (initialChildren) {
      children = filter2(children, (child) => !initialChildren.includes(child));
    }
    return asVoid(fiberAwaitAll(children));
  });
});
var forkIn = /* @__PURE__ */ dual((args2) => isEffect(args2[0]), (self, scope2, options) => withFiber((parent) => {
  const fiber2 = forkUnsafe(parent, self, options?.startImmediately, true, options?.uninterruptible);
  if (!fiber2._exit) {
    if (scope2.state._tag !== "Closed") {
      const key = {};
      const finalizer = () => withFiberId((interruptor) => interruptor === fiber2.id ? void_ : fiberInterrupt(fiber2));
      scopeAddFinalizerUnsafe(scope2, key, finalizer);
      fiber2.addObserver(() => scopeRemoveFinalizerUnsafe(scope2, key));
    } else {
      fiber2.interruptUnsafe(parent.id, fiberStackAnnotations(parent));
    }
  }
  return succeed3(fiber2);
}));
var forkScoped = /* @__PURE__ */ dual((args2) => isEffect(args2[0]), (self, options) => flatMap(scope, (scope2) => forkIn(self, scope2, options)));
var runForkWith = (context2) => (effect, options) => {
  const fiber2 = new FiberImpl(options?.scheduler ? add(context2, Scheduler, options.scheduler) : context2, options?.uninterruptible !== true);
  fiber2.evaluate(effect);
  if (fiber2._exit)
    return fiber2;
  if (options?.signal) {
    if (options.signal.aborted) {
      fiber2.interruptUnsafe();
    } else {
      const abort = () => fiber2.interruptUnsafe();
      options.signal.addEventListener("abort", abort, {
        once: true
      });
      fiber2.addObserver(() => options.signal.removeEventListener("abort", abort));
    }
  }
  if (options?.onFiberStart) {
    options.onFiberStart(fiber2);
  }
  return fiber2;
};
var runFork = /* @__PURE__ */ runForkWith(/* @__PURE__ */ empty());
var runCallbackWith = (context2) => {
  const runFork2 = runForkWith(context2);
  return (effect, options) => {
    const fiber2 = runFork2(effect, options);
    if (options?.onExit) {
      fiber2.addObserver(options.onExit);
    }
    return (interruptor) => {
      return fiber2.interruptUnsafe(interruptor);
    };
  };
};
var runCallback = /* @__PURE__ */ runCallbackWith(/* @__PURE__ */ empty());
var runPromiseExitWith = (context2) => {
  const runFork2 = runForkWith(context2);
  return (effect, options) => {
    const fiber2 = runFork2(effect, options);
    return new Promise((resolve) => {
      fiber2.addObserver((exit2) => resolve(exit2));
    });
  };
};
var runPromiseExit = /* @__PURE__ */ runPromiseExitWith(/* @__PURE__ */ empty());
var runPromiseWith = (context2) => {
  const runPromiseExit2 = runPromiseExitWith(context2);
  return (effect, options) => runPromiseExit2(effect, options).then((exit2) => {
    if (exit2._tag === "Failure") {
      throw causeSquash(exit2.cause);
    }
    return exit2.value;
  });
};
var runPromise = /* @__PURE__ */ runPromiseWith(/* @__PURE__ */ empty());
var runSyncExitWith = (context2) => {
  const runFork2 = runForkWith(context2);
  return (effect) => {
    if (effectIsExit(effect))
      return effect;
    const scheduler = new MixedScheduler("sync");
    const fiber2 = runFork2(effect, {
      scheduler
    });
    fiber2.currentDispatcher?.flush();
    return fiber2._exit ?? exitDie(new AsyncFiberError(fiber2));
  };
};
var runSyncExit = /* @__PURE__ */ runSyncExitWith(/* @__PURE__ */ empty());
var runSyncWith = (context2) => {
  const runSyncExit2 = runSyncExitWith(context2);
  return (effect) => {
    const exit2 = runSyncExit2(effect);
    if (exit2._tag === "Failure")
      throw causeSquash(exit2.cause);
    return exit2.value;
  };
};
var runSync = /* @__PURE__ */ runSyncWith(/* @__PURE__ */ empty());
var succeedTrue = /* @__PURE__ */ succeed3(true);
var succeedFalse = /* @__PURE__ */ succeed3(false);

class Latch {
  waiters = [];
  scheduled = false;
  isOpen;
  constructor(isOpen) {
    this.isOpen = isOpen;
  }
  scheduleUnsafe(fiber2) {
    if (this.scheduled || this.waiters.length === 0) {
      return succeedTrue;
    }
    this.scheduled = true;
    fiber2.currentDispatcher.scheduleTask(this.flushWaiters, 0);
    return succeedTrue;
  }
  flushWaiters = () => {
    this.scheduled = false;
    const waiters = this.waiters;
    this.waiters = [];
    for (let i = 0;i < waiters.length; i++) {
      waiters[i](exitVoid);
    }
  };
  open = /* @__PURE__ */ withFiber((fiber2) => {
    if (this.isOpen)
      return succeedFalse;
    this.isOpen = true;
    return this.scheduleUnsafe(fiber2);
  });
  release = /* @__PURE__ */ withFiber((fiber2) => this.isOpen ? succeedFalse : this.scheduleUnsafe(fiber2));
  openUnsafe() {
    if (this.isOpen)
      return false;
    this.isOpen = true;
    this.flushWaiters();
    return true;
  }
  await = /* @__PURE__ */ callback((resume) => {
    if (this.isOpen) {
      return resume(void_);
    }
    this.waiters.push(resume);
    return sync(() => {
      const index = this.waiters.indexOf(resume);
      if (index !== -1) {
        this.waiters.splice(index, 1);
      }
    });
  });
  closeUnsafe() {
    if (!this.isOpen)
      return false;
    this.isOpen = false;
    return true;
  }
  close = /* @__PURE__ */ sync(() => this.closeUnsafe());
  whenOpen = (self) => flatMap(this.await, () => self);
}
var makeLatchUnsafe = (open) => new Latch(open ?? false);
var tracer = /* @__PURE__ */ withFiber((fiber2) => succeed3(fiber2.getRef(Tracer)));
var withTracer = /* @__PURE__ */ dual(2, (effect, tracer2) => provideService(effect, Tracer, tracer2));
var withTracerEnabled = /* @__PURE__ */ provideService(TracerEnabled);
var withTracerTiming = /* @__PURE__ */ provideService(TracerTimingEnabled);
var bigint02 = /* @__PURE__ */ BigInt(0);
var NoopSpanProto = {
  _tag: "Span",
  spanId: "noop",
  traceId: "noop",
  sampled: false,
  status: {
    _tag: "Ended",
    startTime: bigint02,
    endTime: bigint02,
    exit: exitVoid
  },
  attributes: /* @__PURE__ */ new Map,
  links: [],
  kind: "internal",
  attribute() {},
  event() {},
  end() {},
  addLinks() {}
};
var noopSpan = (options) => Object.assign(Object.create(NoopSpanProto), options);
var filterDisablePropagation = (span) => {
  if (!span)
    return none2();
  return get(span.annotations, DisablePropagation) ? span._tag === "Span" ? filterDisablePropagation(getOrUndefined(span.parent)) : none2() : some2(span);
};
var makeSpanUnsafe = (fiber2, name, options) => {
  const disablePropagation = !fiber2.getRef(TracerEnabled) || options?.annotations && get(options.annotations, DisablePropagation);
  const parent = options?.parent !== undefined ? some2(options.parent) : options?.root ? none2() : filterDisablePropagation(fiber2.currentSpan);
  let span;
  if (disablePropagation) {
    span = noopSpan({
      name,
      parent,
      annotations: add(options?.annotations ?? empty(), DisablePropagation, true)
    });
  } else {
    const tracer2 = fiber2.getRef(Tracer);
    const clock = fiber2.getRef(ClockRef);
    const timingEnabled = fiber2.getRef(TracerTimingEnabled);
    const annotationsFromEnv = fiber2.getRef(TracerSpanAnnotations);
    const linksFromEnv = fiber2.getRef(TracerSpanLinks);
    const level = options?.level ?? fiber2.getRef(CurrentTraceLevel);
    const links = options?.links !== undefined ? [...linksFromEnv, ...options.links] : linksFromEnv.slice();
    span = tracer2.span({
      name,
      parent,
      annotations: options?.annotations ?? empty(),
      links,
      startTime: timingEnabled ? clock.currentTimeNanosUnsafe() : BigInt(0),
      kind: options?.kind ?? "internal",
      root: options?.root ?? isNone2(parent),
      sampled: options?.sampled ?? (isSome2(parent) && parent.value.sampled === false ? false : !isLogLevelGreaterThan(fiber2.getRef(MinimumTraceLevel), level))
    });
    for (const [key, value] of Object.entries(annotationsFromEnv)) {
      span.attribute(key, value);
    }
    if (options?.attributes !== undefined) {
      for (const [key, value] of Object.entries(options.attributes)) {
        span.attribute(key, value);
      }
    }
  }
  return span;
};
var makeSpan = (name, options) => withFiber((fiber2) => succeed3(makeSpanUnsafe(fiber2, name, options)));
var makeSpanScoped = (name, options) => uninterruptible(withFiber((fiber2) => {
  const scope2 = getUnsafe(fiber2.context, scopeTag);
  const span = makeSpanUnsafe(fiber2, name, options ?? {});
  const clock = fiber2.getRef(ClockRef);
  const timingEnabled = fiber2.getRef(TracerTimingEnabled);
  return as(scopeAddFinalizerExit(scope2, (exit2) => endSpan(span, exit2, clock, timingEnabled)), span);
}));
var withSpanScoped = function() {
  const dataFirst = typeof arguments[0] !== "string";
  const name = dataFirst ? arguments[1] : arguments[0];
  const options = addSpanStackTrace(dataFirst ? arguments[2] : arguments[1]);
  if (dataFirst) {
    const self = arguments[0];
    return flatMap(makeSpanScoped(name, options), (span) => withParentSpan(self, span, options));
  }
  return (self) => flatMap(makeSpanScoped(name, options), (span) => withParentSpan(self, span, options));
};
var provideSpanStackFrame = (name, stack) => {
  stack = typeof stack === "function" ? stack : constUndefined;
  return updateService(CurrentStackFrame, (parent) => ({
    name,
    stack,
    parent
  }));
};
var spanAnnotations = TracerSpanAnnotations;
var spanLinks = TracerSpanLinks;
var linkSpans = /* @__PURE__ */ dual((args2) => isEffect(args2[0]), (self, span, attributes = {}) => {
  const spans = Array.isArray(span) ? span : [span];
  const links = spans.map((span2) => ({
    span: span2,
    attributes
  }));
  return updateService(self, TracerSpanLinks, (current) => [...current, ...links]);
});
var endSpan = (span, exit2, clock, timingEnabled) => sync(() => {
  if (span.status._tag === "Ended")
    return;
  span.end(timingEnabled ? clock.currentTimeNanosUnsafe() : bigint02, exit2);
});
var useSpan = (name, ...args2) => {
  const options = args2.length === 1 ? undefined : args2[0];
  const evaluate2 = args2[args2.length - 1];
  return withFiber((fiber2) => {
    const span = makeSpanUnsafe(fiber2, name, options);
    const clock = fiber2.getRef(ClockRef);
    return onExit(internalCall(() => evaluate2(span)), (exit2) => sync(() => {
      if (span.status._tag === "Ended")
        return;
      span.end(clock.currentTimeNanosUnsafe(), exit2);
    }));
  });
};
var provideParentSpan = /* @__PURE__ */ provideService(ParentSpan);
var withParentSpan = function() {
  const dataFirst = isEffect(arguments[0]);
  const span = dataFirst ? arguments[1] : arguments[0];
  let options = dataFirst ? arguments[2] : arguments[1];
  let provideStackFrame = identity;
  if (span._tag === "Span") {
    options = addSpanStackTrace(options);
    provideStackFrame = provideSpanStackFrame(span.name, options?.captureStackTrace);
  }
  if (dataFirst) {
    return provideParentSpan(provideStackFrame(arguments[0]), span);
  }
  return (self) => provideParentSpan(provideStackFrame(self), span);
};
var withSpan = function() {
  const dataFirst = typeof arguments[0] !== "string";
  const name = dataFirst ? arguments[1] : arguments[0];
  const traceOptions = addSpanStackTrace(arguments[2]);
  if (dataFirst) {
    const self = arguments[0];
    return useSpan(name, arguments[2], (span) => withParentSpan(self, span, traceOptions));
  }
  const fnArg = typeof arguments[1] === "function" ? arguments[1] : undefined;
  const options = fnArg ? undefined : arguments[1];
  return (self, ...args2) => useSpan(name, fnArg ? fnArg(...args2) : options, (span) => withParentSpan(self, span, traceOptions));
};
var annotateSpans = /* @__PURE__ */ dual((args2) => isEffect(args2[0]), (effect, ...args2) => updateService(effect, TracerSpanAnnotations, (annotations) => {
  const newAnnotations = {
    ...annotations
  };
  if (args2.length === 1) {
    Object.assign(newAnnotations, args2[0]);
  } else {
    newAnnotations[args2[0]] = args2[1];
  }
  return newAnnotations;
}));
var annotateCurrentSpan = (...args2) => withFiber((fiber2) => {
  const span = fiber2.currentSpanLocal;
  if (span) {
    if (args2.length === 1) {
      for (const [key, value] of Object.entries(args2[0])) {
        span.attribute(key, value);
      }
    } else {
      span.attribute(args2[0], args2[1]);
    }
  }
  return void_;
});
var currentSpan = /* @__PURE__ */ withFiber((fiber2) => {
  const span = fiber2.currentSpanLocal;
  return span ? succeed3(span) : fail3(new NoSuchElementError);
});
var currentParentSpan = /* @__PURE__ */ serviceOptional(ParentSpan);
var ClockRef = /* @__PURE__ */ Reference("effect/Clock", {
  defaultValue: () => new ClockImpl
});
var MAX_TIMER_MILLIS = 2 ** 31 - 1;

class ClockImpl {
  currentTimeMillisUnsafe() {
    return Date.now();
  }
  currentTimeMillis = /* @__PURE__ */ sync(() => this.currentTimeMillisUnsafe());
  currentTimeNanosUnsafe() {
    return processOrPerformanceNow();
  }
  currentTimeNanos = /* @__PURE__ */ sync(() => this.currentTimeNanosUnsafe());
  sleep(duration) {
    const millis2 = toMillis(duration);
    if (millis2 <= 0)
      return yieldNow;
    return callback((resume) => {
      if (millis2 > MAX_TIMER_MILLIS)
        return;
      const handle = setTimeout(() => resume(void_), millis2);
      return sync(() => clearTimeout(handle));
    });
  }
}
var performanceNowNanos = /* @__PURE__ */ function() {
  const bigint1e62 = /* @__PURE__ */ BigInt(1e6);
  if (typeof performance === "undefined" || typeof performance.now === "undefined") {
    return () => BigInt(Date.now()) * bigint1e62;
  } else if (typeof performance.timeOrigin === "number" && performance.timeOrigin === 0) {
    return () => BigInt(Math.round(performance.now() * 1e6));
  }
  const origin = /* @__PURE__ */ BigInt(/* @__PURE__ */ Date.now()) * bigint1e62 - /* @__PURE__ */ BigInt(/* @__PURE__ */ Math.round(/* @__PURE__ */ performance.now() * 1e6));
  return () => origin + BigInt(Math.round(performance.now() * 1e6));
}();
var processOrPerformanceNow = /* @__PURE__ */ function() {
  const processHrtime = typeof process === "object" && "hrtime" in process && typeof process.hrtime.bigint === "function" ? process.hrtime : undefined;
  if (!processHrtime) {
    return performanceNowNanos;
  }
  const origin = /* @__PURE__ */ performanceNowNanos() - /* @__PURE__ */ processHrtime.bigint();
  return () => origin + processHrtime.bigint();
}();
var clockWith = (f) => withFiber((fiber2) => f(fiber2.getRef(ClockRef)));
var sleep = (duration) => clockWith((clock) => clock.sleep(fromInputUnsafe(duration)));
var currentTimeMillis = /* @__PURE__ */ clockWith((clock) => clock.currentTimeMillis);
var TimeoutErrorTypeId = "~effect/Cause/TimeoutError";
var isTimeoutError = (u) => hasProperty(u, TimeoutErrorTypeId);

class TimeoutError extends (/* @__PURE__ */ TaggedError("TimeoutError")) {
  [TimeoutErrorTypeId] = TimeoutErrorTypeId;
  constructor(message) {
    super({
      message
    });
  }
}
var AsyncFiberErrorTypeId = "~effect/Cause/AsyncFiberError";
class AsyncFiberError extends (/* @__PURE__ */ TaggedError("AsyncFiberError")) {
  [AsyncFiberErrorTypeId] = AsyncFiberErrorTypeId;
  constructor(fiber2) {
    super({
      message: "An asynchronous Effect was executed with Effect.runSync",
      fiber: fiber2
    });
  }
}
var UnknownErrorTypeId = "~effect/Cause/UnknownError";
class UnknownError extends (/* @__PURE__ */ TaggedError("UnknownError")) {
  [UnknownErrorTypeId] = UnknownErrorTypeId;
  constructor(cause, message) {
    super({
      message,
      cause
    });
  }
}
var ConsoleRef = /* @__PURE__ */ Reference("effect/Console/CurrentConsole", {
  defaultValue: () => globalThis.console
});
var logLevelToOrder = (level) => {
  switch (level) {
    case "All":
      return Number.MIN_SAFE_INTEGER;
    case "Fatal":
      return 50000;
    case "Error":
      return 40000;
    case "Warn":
      return 30000;
    case "Info":
      return 20000;
    case "Debug":
      return 1e4;
    case "Trace":
      return 0;
    case "None":
      return Number.MAX_SAFE_INTEGER;
  }
};
var LogLevelOrder = /* @__PURE__ */ mapInput(Number2, logLevelToOrder);
var isLogLevelGreaterThan = /* @__PURE__ */ isGreaterThan(LogLevelOrder);
var CurrentLoggers = /* @__PURE__ */ Reference("effect/Loggers/CurrentLoggers", {
  defaultValue: () => new Set([defaultLogger, tracerLogger])
});
var LogToStderr = /* @__PURE__ */ Reference("effect/Logger/LogToStderr", {
  defaultValue: constFalse
});
var annotateLogsScoped = function() {
  const entries = typeof arguments[0] === "string" ? [[arguments[0], arguments[1]]] : Object.entries(arguments[0]);
  return uninterruptible(withFiber((fiber2) => {
    const prev = fiber2.getRef(CurrentLogAnnotations);
    const next = {
      ...prev
    };
    for (let i = 0;i < entries.length; i++) {
      const [key, value] = entries[i];
      next[key] = value;
    }
    fiber2.setContext(add(fiber2.context, CurrentLogAnnotations, next));
    return scopeAddFinalizerExit(getUnsafe(fiber2.context, scopeTag), (_) => {
      const current = fiber2.getRef(CurrentLogAnnotations);
      const next2 = {
        ...current
      };
      for (let i = 0;i < entries.length; i++) {
        const [key, value] = entries[i];
        if (current[key] !== value)
          continue;
        if (key in prev) {
          next2[key] = prev[key];
        } else {
          delete next2[key];
        }
      }
      fiber2.setContext(add(fiber2.context, CurrentLogAnnotations, next2));
      return void_;
    });
  }));
};
var LoggerTypeId = "~effect/Logger";
var LoggerProto = {
  [LoggerTypeId]: {
    _Message: identity,
    _Output: identity
  },
  pipe() {
    return pipeArguments(this, arguments);
  }
};
var loggerMake = (log) => {
  const self = Object.create(LoggerProto);
  self.log = log;
  return self;
};
var formatLabel = (key) => key.replace(/[\s="]/g, "_");
var formatLogSpan = (self, now) => {
  const label = formatLabel(self[0]);
  return `${label}=${now - self[1]}ms`;
};
var logWithLevel = (level) => (...message) => {
  let cause = undefined;
  for (let i = 0, len = message.length;i < len; i++) {
    const msg = message[i];
    if (isCause(msg)) {
      if (cause) {
        message.splice(i, 1);
      } else {
        message = message.slice(0, i).concat(message.slice(i + 1));
      }
      cause = cause ? causeFromReasons(cause.reasons.concat(msg.reasons)) : msg;
      i--;
    }
  }
  if (cause === undefined) {
    cause = causeEmpty;
  }
  return withFiber((fiber2) => {
    const logLevel = level ?? fiber2.currentLogLevel;
    if (isLogLevelGreaterThan(fiber2.minimumLogLevel, logLevel)) {
      return void_;
    }
    const clock = fiber2.getRef(ClockRef);
    const loggers = fiber2.getRef(CurrentLoggers);
    if (loggers.size > 0) {
      const date = new Date(clock.currentTimeMillisUnsafe());
      for (const logger of loggers) {
        logger.log({
          cause,
          fiber: fiber2,
          date,
          logLevel,
          message
        });
      }
    }
    return void_;
  });
};
var colors = {
  bold: "1",
  red: "31",
  green: "32",
  yellow: "33",
  blue: "34",
  cyan: "36",
  white: "37",
  gray: "90",
  black: "30",
  bgBrightRed: "101"
};
var logLevelColors = {
  None: [],
  All: [],
  Trace: [colors.gray],
  Debug: [colors.blue],
  Info: [colors.green],
  Warn: [colors.yellow],
  Error: [colors.red],
  Fatal: [colors.bgBrightRed, colors.black]
};
var defaultDateFormat = (date) => `${date.getHours().toString().padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}:${date.getSeconds().toString().padStart(2, "0")}.${date.getMilliseconds().toString().padStart(3, "0")}`;
var hasProcessStdout = typeof process === "object" && process !== null && typeof process.stdout === "object" && process.stdout !== null;
var processStdoutIsTTY = hasProcessStdout && process.stdout.isTTY === true;
var hasProcessStdoutOrDeno = hasProcessStdout || "Deno" in globalThis;
var defaultLogger = /* @__PURE__ */ loggerMake(({
  cause,
  date,
  fiber: fiber2,
  logLevel,
  message
}) => {
  const message_ = Array.isArray(message) ? message.slice() : [message];
  if (cause.reasons.length > 0) {
    message_.push(causePretty(cause));
  }
  const now = date.getTime();
  const spans = fiber2.getRef(CurrentLogSpans);
  let spanString = "";
  for (const span of spans) {
    spanString += ` ${formatLogSpan(span, now)}`;
  }
  const annotations = fiber2.getRef(CurrentLogAnnotations);
  if (Object.keys(annotations).length > 0) {
    message_.push(annotations);
  }
  const console = fiber2.getRef(ConsoleRef);
  const log = fiber2.getRef(LogToStderr) ? console.error : console.log;
  log(`[${defaultDateFormat(date)}] ${logLevel.toUpperCase()} (#${fiber2.id})${spanString}:`, ...message_);
});
var tracerLogger = /* @__PURE__ */ loggerMake(({
  cause,
  fiber: fiber2,
  logLevel,
  message
}) => {
  const clock = fiber2.getRef(ClockRef);
  const annotations = fiber2.getRef(CurrentLogAnnotations);
  const span = fiber2.currentSpan;
  if (span === undefined || span._tag === "ExternalSpan")
    return;
  const attributes = {};
  for (const [key, value] of Object.entries(annotations)) {
    attributes[key] = value;
  }
  attributes["effect.fiberId"] = fiber2.id;
  attributes["effect.logLevel"] = logLevel.toUpperCase();
  if (cause.reasons.length > 0) {
    attributes["effect.cause"] = causePretty(cause);
  }
  span.event(toStringUnknown(Array.isArray(message) && message.length === 1 ? message[0] : message), clock.currentTimeNanosUnsafe(), attributes);
});
function interruptChildrenPatch() {
  fiberMiddleware.interruptChildren ??= fiberInterruptChildren;
}
var undefined_ = /* @__PURE__ */ succeed3(undefined);
var withErrorReporting = /* @__PURE__ */ dual((args2) => isEffect(args2[0]), (self, options) => onError(self, (cause) => withFiber((fiber2) => {
  reportCauseUnsafe(fiber2, cause, options?.defectsOnly);
  return void_;
})));
var reportCauseUnsafe = (fiber2, cause, defectsOnly) => {
  const reporters = fiber2.getRef(CurrentErrorReporters);
  if (reporters.size === 0)
    return;
  if (defectsOnly && !hasDies(cause))
    return;
  const opts = {
    cause,
    fiber: fiber2,
    timestamp: fiber2.getRef(ClockRef).currentTimeNanosUnsafe()
  };
  reporters.forEach((reporter) => reporter.report(opts));
};

// node_modules/effect/dist/Exit.js
var succeed4 = exitSucceed;
var failCause2 = exitFailCause;
var fail4 = exitFail;
var void_2 = exitVoid;
var isSuccess4 = exitIsSuccess;
var getSuccess2 = exitGetSuccess;

// node_modules/effect/dist/Deferred.js
var TypeId5 = "~effect/Deferred";
var DeferredProto = {
  [TypeId5]: {
    _A: identity,
    _E: identity
  },
  pipe() {
    return pipeArguments(this, arguments);
  }
};
var makeUnsafe2 = () => {
  const self = Object.create(DeferredProto);
  self.resumes = undefined;
  self.effect = undefined;
  return self;
};
var _await = (self) => callback((resume) => {
  if (self.effect)
    return resume(self.effect);
  self.resumes ??= [];
  self.resumes.push(resume);
  return sync(() => {
    const index = self.resumes.indexOf(resume);
    self.resumes.splice(index, 1);
  });
});
var completeWith = /* @__PURE__ */ dual(2, (self, effect) => sync(() => doneUnsafe(self, effect)));
var done2 = completeWith;
var doneUnsafe = (self, effect) => {
  if (self.effect)
    return false;
  self.effect = effect;
  if (self.resumes) {
    for (let i = 0;i < self.resumes.length; i++) {
      self.resumes[i](effect);
    }
    self.resumes = undefined;
  }
  return true;
};

// node_modules/effect/dist/References.js
var CurrentLogAnnotations2 = CurrentLogAnnotations;
var CurrentLogSpans2 = CurrentLogSpans;

// node_modules/effect/dist/Scope.js
var makeUnsafe3 = scopeMakeUnsafe;
var provide = provideScope;
var addFinalizerExit = scopeAddFinalizerExit;
var addFinalizer2 = scopeAddFinalizer;
var forkUnsafe2 = scopeForkUnsafe;
var close = scopeClose;

// node_modules/effect/dist/Layer.js
var TypeId6 = "~effect/Layer";
var MemoMapTypeId = "~effect/Layer/MemoMap";
var memoMapReuse = (entry, scope2) => {
  entry.observers++;
  return andThen(scopeAddFinalizerExit(scope2, (exit2) => entry.finalizer(exit2)), entry.effect);
};
var isLayer = (u) => hasProperty(u, TypeId6);
var LayerProto = {
  [TypeId6]: {
    _ROut: identity,
    _E: identity,
    _RIn: identity
  },
  pipe() {
    return pipeArguments(this, arguments);
  }
};
var fromBuildUnsafe = (build) => {
  const self = Object.create(LayerProto);
  self.build = build;
  return self;
};
var fromBuild = (build) => fromBuildUnsafe((memoMap, scope2) => {
  const layerScope = forkUnsafe2(scope2);
  return onExit(build(memoMap, layerScope), (exit2) => exit2._tag === "Failure" ? close(layerScope, exit2) : void_);
});
var fromBuildMemo = (build) => {
  const self = fromBuild((memoMap, scope2) => memoMap.getOrElseMemoize(self, scope2, build));
  return self;
};
var memoMapBuild = (memoMap, layer, scope2, build) => {
  const layerScope = makeUnsafe3();
  const deferred = makeUnsafe2();
  const entry = {
    observers: 1,
    effect: _await(deferred),
    finalizer: (exit2) => suspend(() => {
      entry.observers--;
      if (entry.observers === 0) {
        memoMap.map.delete(layer);
        return close(layerScope, exit2);
      }
      return void_;
    })
  };
  memoMap.map.set(layer, entry);
  return scopeAddFinalizerExit(scope2, entry.finalizer).pipe(flatMap(() => build(memoMap, layerScope)), onExit((exit2) => {
    entry.effect = exit2;
    return done2(deferred, exit2);
  }));
};

class MemoMapImpl {
  get [MemoMapTypeId]() {
    return MemoMapTypeId;
  }
  parent;
  constructor(parent) {
    this.parent = parent;
  }
  map = /* @__PURE__ */ new Map;
  get(layer, scope2) {
    const local = this.map.get(layer);
    if (local) {
      return memoMapReuse(local, scope2);
    }
    return this.parent?.get(layer, scope2);
  }
  getOrElseMemoize(layer, scope2, build) {
    const existing = this.get(layer, scope2);
    if (existing) {
      return existing;
    }
    return memoMapBuild(this, layer, scope2, build);
  }
}
var makeMemoMapUnsafe = () => new MemoMapImpl;
class CurrentMemoMap extends (/* @__PURE__ */ Service()("effect/Layer/CurrentMemoMap")) {
  static getOrCreate = /* @__PURE__ */ getOrElse2(this, makeMemoMapUnsafe);
}
var buildWithMemoMap = /* @__PURE__ */ dual(3, (self, memoMap, scope2) => provideService(map4(self.build(memoMap, scope2), add(CurrentMemoMap, memoMap)), CurrentMemoMap, memoMap));
var buildWithScope = /* @__PURE__ */ dual(2, (self, scope2) => withFiber((fiber2) => buildWithMemoMap(self, CurrentMemoMap.getOrCreate(fiber2.context), scope2)));
var succeedContext = (context2) => fromBuildUnsafe(constant(succeed3(context2)));
var effect = function() {
  if (arguments.length === 1) {
    return (effect2) => effectImpl(arguments[0], effect2);
  }
  return effectImpl(arguments[0], arguments[1]);
};
var effectImpl = (service2, effect2) => effectContext(map4(effect2, (value) => make6(service2, value)));
var effectContext = (effect2) => fromBuildMemo((_, scope2) => provide(effect2, scope2));
var mergeAllEffect = (layers, memoMap, scope2) => {
  const parentScope = forkUnsafe2(scope2, "parallel");
  return forEach(layers, (layer) => layer.build(memoMap, forkUnsafe2(parentScope, "sequential")), {
    concurrency: layers.length
  }).pipe(map4((context2) => mergeAll(...context2)));
};
var mergeAll2 = (...layers) => fromBuild((memoMap, scope2) => mergeAllEffect(layers, memoMap, scope2));
var provideWith = (self, that, f) => fromBuild((memoMap, scope2) => flatMap(Array.isArray(that) ? mergeAllEffect(that, memoMap, scope2) : that.build(memoMap, scope2), (context2) => self.build(memoMap, scope2).pipe(provideContext(context2), map4((merged) => f(merged, context2)))));
var provide2 = /* @__PURE__ */ dual(2, (self, that) => provideWith(self, that, identity));

// node_modules/effect/dist/ExecutionPlan.js
var TypeId7 = "~effect/ExecutionPlan";
var Proto2 = {
  [TypeId7]: TypeId7,
  get captureRequirements() {
    const self = this;
    return contextWith((context2) => succeed3(makeProto(self.steps.map((step) => ({
      ...step,
      provide: isLayer(step.provide) ? provide2(step.provide, succeedContext(context2)) : step.provide
    })))));
  },
  pipe() {
    return pipeArguments(this, arguments);
  }
};
var makeProto = (steps) => {
  const self = Object.create(Proto2);
  self.steps = steps;
  return self;
};
var CurrentMetadata = /* @__PURE__ */ Reference("effect/ExecutionPlan/CurrentMetadata", {
  defaultValue: /* @__PURE__ */ constant({
    attempt: 0,
    stepIndex: 0
  })
});

// node_modules/effect/dist/Cause.js
var squash = causeSquash;
var findError2 = findError;
var hasInterrupts2 = hasInterrupts;
var isDone2 = isDone;
var done3 = done;
var isTimeoutError2 = isTimeoutError;

// node_modules/effect/dist/Clock.js
var Clock = ClockRef;

// node_modules/effect/dist/Pull.js
var catchDone = /* @__PURE__ */ dual(2, (effect2, f) => catchCauseFilter(effect2, filterDoneLeftover, (l) => f(l)));
var filterDone = /* @__PURE__ */ composePassthrough(findError2, (e) => isDone2(e) ? succeed2(e) : fail2(e));
var filterDoneLeftover = /* @__PURE__ */ composePassthrough(findError2, (e) => isDone2(e) ? succeed2(e.value) : fail2(e));
var doneExitFromCause = (cause) => {
  const halt = filterDone(cause);
  return !isFailure2(halt) ? succeed4(halt.success.value) : failCause2(halt.failure);
};
var matchEffect2 = /* @__PURE__ */ dual(2, (self, options) => matchCauseEffect(self, {
  onSuccess: options.onSuccess,
  onFailure: (cause) => {
    const halt = filterDone(cause);
    return !isFailure2(halt) ? options.onDone(halt.success.value) : options.onFailure(halt.failure);
  }
}));

// node_modules/effect/dist/Schedule.js
var TypeId8 = "~effect/Schedule";
var CurrentMetadata2 = /* @__PURE__ */ Reference("effect/Schedule/CurrentMetadata", {
  defaultValue: /* @__PURE__ */ constant({
    input: undefined,
    output: undefined,
    duration: zero,
    attempt: 0,
    start: 0,
    now: 0,
    elapsed: 0,
    elapsedSincePrevious: 0
  })
});
var ScheduleProto = {
  [TypeId8]: {
    _Out: identity,
    _In: identity,
    _Env: identity
  },
  pipe() {
    return pipeArguments(this, arguments);
  }
};
var isSchedule = (u) => hasProperty(u, TypeId8);
var fromStep = (step) => {
  const self = Object.create(ScheduleProto);
  self.step = step;
  return self;
};
var metadataFn = () => {
  let n = 0;
  let previous;
  let start;
  return (now, input) => {
    if (start === undefined)
      start = now;
    const elapsed = now - start;
    const elapsedSincePrevious = previous === undefined ? 0 : now - previous;
    previous = now;
    return {
      input,
      attempt: ++n,
      start,
      now,
      elapsed,
      elapsedSincePrevious
    };
  };
};
var fromStepWithMetadata = (step) => fromStep(map4(step, (f) => {
  const meta = metadataFn();
  return (now, input) => f(meta(now, input));
}));
var toStep = (schedule) => catchCause(schedule.step, (cause) => succeed3(() => failCause(cause)));
var toStepWithMetadata = (schedule) => clockWith((clock) => map4(toStep(schedule), (step) => {
  const metaFn = metadataFn();
  return (input) => suspend(() => {
    const now = clock.currentTimeMillisUnsafe();
    return flatMap(step(now, input), ([output, duration]) => {
      const meta = metaFn(now, input);
      meta.output = output;
      meta.duration = duration;
      return as(sleep(duration), meta);
    });
  });
}));
var passthrough = (self) => fromStep(map4(toStep(self), (step) => (now, input) => matchEffect2(step(now, input), {
  onSuccess: (result2) => succeed3([input, result2[1]]),
  onFailure: failCause,
  onDone: () => done3(input)
})));
var recurs = (times2) => while_(forever2, ({
  attempt
}) => succeed3(attempt <= times2));
var spaced = (duration) => {
  const decoded = fromInputUnsafe(duration);
  return fromStepWithMetadata(succeed3((meta) => succeed3([meta.attempt - 1, decoded])));
};
var while_ = /* @__PURE__ */ dual(2, (self, predicate) => fromStep(map4(toStep(self), (step) => {
  const meta = metadataFn();
  return (now, input) => flatMap(step(now, input), (result2) => {
    const [output, duration] = result2;
    const eff = predicate({
      ...meta(now, input),
      output,
      duration
    });
    return flatMap(isEffect(eff) ? eff : succeed3(eff), (check) => check ? succeed3(result2) : done3(output));
  });
})));
var forever2 = /* @__PURE__ */ spaced(zero);

// node_modules/effect/dist/internal/layer.js
var provideLayer = (self, layer, options) => scopedWith((scope2) => flatMap(options?.local ? buildWithMemoMap(layer, makeMemoMapUnsafe(), scope2) : buildWithScope(layer, scope2), (context2) => provideContext(self, context2)));
var provide3 = /* @__PURE__ */ dual((args2) => isEffect(args2[0]), (self, source, options) => isContext(source) ? provideContext(self, source) : provideLayer(self, Array.isArray(source) ? mergeAll2(...source) : source, options));

// node_modules/effect/dist/internal/schedule.js
var repeatOrElse = /* @__PURE__ */ dual(3, (self, schedule, orElse) => flatMap(toStepWithMetadata(schedule), (step) => {
  let meta = CurrentMetadata2.defaultValue();
  return catch_(forever(tap(flatMap(suspend(() => provideService(self, CurrentMetadata2, meta)), step), (meta_) => sync(() => {
    meta = meta_;
  })), {
    disableYield: true
  }), (error) => isDone(error) ? succeed3(error.value) : orElse(error, meta.attempt === 0 ? none2() : some2(meta)));
}));
var retryOrElse = /* @__PURE__ */ dual(3, (self, policy, orElse) => flatMap(toStepWithMetadata(policy), (step) => {
  let meta = CurrentMetadata2.defaultValue();
  let lastError;
  const loop = catch_(suspend(() => provideService(self, CurrentMetadata2, meta)), (error) => {
    lastError = error;
    return flatMap(step(error), (meta_) => {
      meta = meta_;
      return loop;
    });
  });
  return catchDone(loop, (out) => internalCall(() => orElse(lastError, out)));
}));
var repeat = /* @__PURE__ */ dual(2, (self, options) => {
  const schedule = typeof options === "function" ? options(identity) : isSchedule(options) ? options : buildFromOptions(options);
  return repeatOrElse(self, schedule, fail3);
});
var retry = /* @__PURE__ */ dual(2, (self, options) => {
  const schedule = typeof options === "function" ? options(identity) : isSchedule(options) ? options : buildFromOptions(options);
  return retryOrElse(self, schedule, fail3);
});
var scheduleFrom = /* @__PURE__ */ dual(3, (self, initial, schedule) => flatMap(toStepWithMetadata(schedule), (step) => {
  let meta = CurrentMetadata2.defaultValue();
  const selfWithMeta = suspend(() => provideService(self, CurrentMetadata2, meta));
  return catch_(flatMap(step(initial), (meta_) => {
    meta = meta_;
    const body = constant(flatMap(selfWithMeta, step));
    return whileLoop({
      while: constTrue,
      body,
      step(meta_2) {
        meta = meta_2;
      }
    });
  }), (error) => isDone(error) ? succeed3(error.value) : fail3(error));
}));
var passthroughForever = /* @__PURE__ */ passthrough(forever2);
var buildFromOptions = (options) => {
  let schedule = options.schedule ? passthrough(options.schedule) : passthroughForever;
  if (options.while) {
    schedule = while_(schedule, ({
      input
    }) => {
      const applied = options.while(input);
      return isEffect(applied) ? applied : succeed3(applied);
    });
  }
  if (options.until) {
    schedule = while_(schedule, ({
      input
    }) => {
      const applied = options.until(input);
      return isEffect(applied) ? map4(applied, (b) => !b) : succeed3(!applied);
    });
  }
  if (options.times !== undefined) {
    schedule = while_(schedule, ({
      attempt
    }) => succeed3(attempt <= options.times));
  }
  return schedule;
};

// node_modules/effect/dist/internal/executionPlan.js
var withExecutionPlan = /* @__PURE__ */ dual(2, (self, plan) => suspend(() => {
  let i = 0;
  let meta = {
    attempt: 0,
    stepIndex: 0
  };
  const provideMeta = provideServiceEffect(CurrentMetadata, sync(() => {
    meta = {
      attempt: meta.attempt + 1,
      stepIndex: i
    };
    return meta;
  }));
  let result2;
  return flatMap(whileLoop({
    while: () => i < plan.steps.length && (result2 === undefined || isFailure2(result2)),
    body() {
      const step = plan.steps[i];
      let nextEffect = provideMeta(provide3(self, step.provide));
      if (result2) {
        let attempted = false;
        const wrapped = nextEffect;
        nextEffect = suspend(() => {
          if (attempted)
            return wrapped;
          attempted = true;
          return fromResult(result2);
        });
        nextEffect = retry(nextEffect, scheduleFromStep(step, false));
      } else {
        const schedule = scheduleFromStep(step, true);
        nextEffect = schedule ? retry(nextEffect, schedule) : nextEffect;
      }
      return result(nextEffect);
    },
    step(result_) {
      result2 = result_;
      i++;
    }
  }), () => fromResult(result2));
}));
var scheduleFromStep = (step, first) => {
  if (!first) {
    return buildFromOptions({
      schedule: step.schedule ? step.schedule : step.attempts ? undefined : scheduleOnce,
      times: step.attempts,
      while: step.while
    });
  } else if (step.attempts === 1 || !(step.schedule || step.attempts)) {
    return;
  }
  return buildFromOptions({
    schedule: step.schedule,
    while: step.while,
    times: step.attempts ? step.attempts - 1 : undefined
  });
};
var scheduleOnce = /* @__PURE__ */ recurs(1);

// node_modules/effect/dist/Request.js
var TypeId9 = "~effect/Request";
var requestVariance = /* @__PURE__ */ byReferenceUnsafe({
  _E: (_) => _,
  _A: (_) => _,
  _R: (_) => _
});
var RequestPrototype = {
  ...StructuralProto,
  [TypeId9]: requestVariance
};
var makeEntry = (options) => options;

// node_modules/effect/dist/internal/request.js
var request = /* @__PURE__ */ dual(2, (self, resolver) => {
  const withResolver = (resolver2) => callback((resume) => {
    const entry = addEntry(resolver2, self, resume, getCurrentFiber());
    return maybeRemoveEntry(resolver2, entry);
  });
  return isEffect(resolver) ? flatMap(resolver, withResolver) : withResolver(resolver);
});
var requestUnsafe = (self, options) => {
  const entry = addEntry(options.resolver, self, options.onExit, {
    context: options.context,
    currentScheduler: get(options.context, Scheduler)
  });
  return () => removeEntryUnsafe(options.resolver, entry);
};
var batchPool = [];
var pendingBatches = /* @__PURE__ */ new WeakMap;
var addEntry = (resolver, request2, resume, fiber2) => {
  let batchMap = pendingBatches.get(resolver);
  if (!batchMap) {
    batchMap = new Map;
    pendingBatches.set(resolver, batchMap);
  }
  let batch;
  let completed = false;
  const entry = makeEntry({
    request: request2,
    context: fiber2.context,
    uninterruptible: false,
    completeUnsafe(effect2) {
      if (completed)
        return;
      completed = true;
      resume(effect2);
      batch?.entrySet.delete(entry);
    }
  });
  if (resolver.preCheck !== undefined && !resolver.preCheck(entry)) {
    return entry;
  }
  const key = resolver.batchKey(entry);
  batch = batchMap.get(key);
  if (!batch) {
    if (batchPool.length > 0) {
      batch = batchPool.pop();
      batch.key = key;
      batch.resolver = resolver;
      batch.map = batchMap;
    } else {
      const newBatch = {
        key,
        resolver,
        map: batchMap,
        entrySet: new Set,
        entries: new Set,
        delayEffect: flatMap(suspend(() => newBatch.resolver.delay), (_) => runBatch(newBatch)),
        run: onExit(suspend(() => newBatch.resolver.runAll(Array.from(newBatch.entries), newBatch.key)), (exit2) => {
          for (const entry2 of newBatch.entrySet) {
            entry2.completeUnsafe(exit2._tag === "Success" ? exitDie(new Error("Effect.request: RequestResolver did not complete request", {
              cause: entry2.request
            })) : exit2);
          }
          newBatch.entries.clear();
          if (batchPool.length < 128) {
            newBatch.entrySet.clear();
            newBatch.key = undefined;
            newBatch.fiber = undefined;
            newBatch.resolver = undefined;
            newBatch.map = undefined;
            batchPool.push(newBatch);
          }
          return void_;
        })
      };
      batch = newBatch;
    }
    batchMap.set(key, batch);
    batch.fiber = runForkWith(fiber2.context)(batch.delayEffect, {
      scheduler: fiber2.currentScheduler
    });
  }
  batch.entrySet.add(entry);
  batch.entries.add(entry);
  if (batch.resolver.collectWhile(batch.entries))
    return entry;
  batch.fiber.interruptUnsafe(fiber2.id);
  batch.fiber = runForkWith(fiber2.context)(runBatch(batch), {
    scheduler: fiber2.currentScheduler
  });
  return entry;
};
var removeEntryUnsafe = (resolver, entry) => {
  if (entry.uninterruptible)
    return;
  const batchMap = pendingBatches.get(resolver);
  if (!batchMap)
    return;
  const key = resolver.batchKey(entry.request);
  const batch = batchMap.get(key);
  if (!batch)
    return;
  batch.entries.delete(entry);
  batch.entrySet.delete(entry);
  if (batch.entries.size === 0) {
    batchMap.delete(key);
    batch.fiber?.interruptUnsafe();
  }
};
var maybeRemoveEntry = (resolver, entry) => sync(() => removeEntryUnsafe(resolver, entry));
function runBatch(batch) {
  if (!batch.map.has(batch.key))
    return void_;
  batch.map.delete(batch.key);
  return batch.run;
}

// node_modules/effect/dist/Metric.js
var CurrentMetricAttributesKey = "effect/Metric/CurrentMetricAttributes";
var CurrentMetricAttributes = /* @__PURE__ */ Reference(CurrentMetricAttributesKey, {
  defaultValue: () => ({})
});
var MetricRegistryKey = "~effect/observability/Metric/MetricRegistryKey";
var MetricRegistry = /* @__PURE__ */ Reference(MetricRegistryKey, {
  defaultValue: () => new Map
});
var TypeId10 = "~effect/observability/Metric";

class Metric$ {
  [TypeId10] = TypeId10;
  #metadataCache = /* @__PURE__ */ new WeakMap;
  #metadata;
  id;
  description;
  attributes;
  constructor(id, description, attributes) {
    this.id = id;
    this.description = description;
    this.attributes = attributes;
  }
  valueUnsafe(context2) {
    return this.hook(context2).get(context2);
  }
  modifyUnsafe(input, context2) {
    return this.hook(context2).modify(input, context2);
  }
  updateUnsafe(input, context2) {
    return this.hook(context2).update(input, context2);
  }
  hook(context2) {
    const extraAttributes = get(context2, CurrentMetricAttributes);
    if (Object.keys(extraAttributes).length === 0) {
      if (isNotUndefined(this.#metadata)) {
        return this.#metadata.hooks;
      }
      this.#metadata = this.getOrCreate(context2, this.attributes);
      return this.#metadata.hooks;
    }
    const mergedAttributes = mergeAttributes(this.attributes, extraAttributes);
    let metadata = this.#metadataCache.get(mergedAttributes);
    if (isNotUndefined(metadata)) {
      return metadata.hooks;
    }
    metadata = this.getOrCreate(context2, mergedAttributes);
    this.#metadataCache.set(mergedAttributes, metadata);
    return metadata.hooks;
  }
  getOrCreate(context2, attributes) {
    const key = makeKey(this, attributes);
    const registry = get(context2, MetricRegistry);
    if (registry.has(key)) {
      return registry.get(key);
    }
    const hooks = this.createHooks();
    const meta = {
      id: this.id,
      type: this.type,
      description: this.description,
      attributes: attributesToRecord(attributes),
      hooks
    };
    registry.set(key, meta);
    return meta;
  }
  pipe() {
    return pipeArguments(this, arguments);
  }
}
var bigint03 = /* @__PURE__ */ BigInt(0);

class CounterMetric extends Metric$ {
  type = "Counter";
  #bigint;
  #incremental;
  constructor(id, options) {
    super(id, options?.description, attributesToRecord(options?.attributes));
    this.#bigint = options?.bigint ?? false;
    this.#incremental = options?.incremental ?? false;
  }
  createHooks() {
    let count = this.#bigint ? bigint03 : 0;
    const canUpdate = this.#incremental ? this.#bigint ? (value) => value >= bigint03 : (value) => value >= 0 : (_value) => true;
    const update = (value) => {
      if (canUpdate(value)) {
        count = count + value;
      }
    };
    return makeHooks(() => ({
      count,
      incremental: this.#incremental
    }), update);
  }
}

class GaugeMetric extends Metric$ {
  type = "Gauge";
  #bigint;
  constructor(id, options) {
    super(id, options?.description, attributesToRecord(options?.attributes));
    this.#bigint = options?.bigint ?? false;
  }
  createHooks() {
    let value = this.#bigint ? BigInt(0) : 0;
    const update = (input) => {
      value = input;
    };
    const modify = (input) => {
      value = value + input;
    };
    return makeHooks(() => ({
      value
    }), update, modify);
  }
}

class FrequencyMetric extends Metric$ {
  type = "Frequency";
  #preregisteredWords;
  constructor(id, options) {
    super(id, options?.description, attributesToRecord(options?.attributes));
    this.#preregisteredWords = options?.preregisteredWords;
  }
  createHooks() {
    const occurrences = new Map;
    if (isNotUndefined(this.#preregisteredWords)) {
      for (const word of this.#preregisteredWords) {
        occurrences.set(word, 0);
      }
    }
    const update = (word) => {
      const count = occurrences.get(word) ?? 0;
      occurrences.set(word, count + 1);
    };
    return makeHooks(() => ({
      occurrences
    }), update);
  }
}

class HistogramMetric extends Metric$ {
  type = "Histogram";
  #boundaries;
  constructor(id, options) {
    super(id, options?.description, attributesToRecord(options?.attributes));
    this.#boundaries = options.boundaries;
  }
  createHooks() {
    const bounds = this.#boundaries;
    const size = bounds.length;
    const values = new Uint32Array(size + 1);
    const boundaries = new Float64Array(size);
    let count = 0;
    let sum2 = 0;
    let min4 = Number.MAX_VALUE;
    let max4 = Number.MIN_VALUE;
    map3(sort(bounds, Number2), (n, i) => {
      boundaries[i] = n;
    });
    const update = (value) => {
      let from = 0;
      let to = size;
      while (from !== to) {
        const mid = Math.floor(from + (to - from) / 2);
        const boundary = boundaries[mid];
        if (value <= boundary) {
          to = mid;
        } else {
          from = mid;
        }
        if (to === from + 1) {
          if (value <= boundaries[from]) {
            to = from;
          } else {
            from = to;
          }
        }
      }
      values[from] = values[from] + 1;
      count = count + 1;
      sum2 = sum2 + value;
      if (value < min4) {
        min4 = value;
      }
      if (value > max4) {
        max4 = value;
      }
    };
    const getBuckets = () => {
      const builder = allocate(size);
      let cumulated = 0;
      for (let i = 0;i < size; i++) {
        const boundary = boundaries[i];
        const value = values[i];
        cumulated = cumulated + value;
        builder[i] = [boundary, cumulated];
      }
      return builder;
    };
    return makeHooks(() => ({
      buckets: getBuckets(),
      count,
      min: min4,
      max: max4,
      sum: sum2
    }), update);
  }
}

class SummaryMetric extends Metric$ {
  type = "Summary";
  #maxAge;
  #maxSize;
  #quantiles;
  constructor(id, options) {
    super(id, options?.description, attributesToRecord(options?.attributes));
    this.#maxAge = Math.max(toMillis(fromInputUnsafe(options.maxAge)), 0);
    this.#maxSize = options.maxSize;
    this.#quantiles = options.quantiles;
  }
  createHooks() {
    const sortedQuantiles = sort(this.#quantiles, Number2);
    const observations = allocate(this.#maxSize);
    for (const quantile of this.#quantiles) {
      if (quantile < 0 || quantile > 1) {
        throw new Error(`Quantile must be between 0 and 1, found: ${quantile}`);
      }
    }
    let head = 0;
    let count = 0;
    let sum2 = 0;
    let min4 = Number.MAX_VALUE;
    let max4 = Number.MIN_VALUE;
    const snapshot = (now) => {
      const builder = [];
      let i = 0;
      while (i < this.#maxSize) {
        const observation = observations[i];
        if (isNotUndefined(observation)) {
          const [timestamp, value] = observation;
          const age = now - timestamp;
          if (age >= 0 && age <= this.#maxAge) {
            builder.push(value);
          }
        }
        i = i + 1;
      }
      const samples = sort(builder, Number2);
      const sampleSize = samples.length;
      if (sampleSize === 0) {
        return sortedQuantiles.map((q) => [q, undefined]);
      }
      return sortedQuantiles.map((q) => {
        if (q <= 0)
          return [q, samples[0]];
        if (q >= 1)
          return [q, samples[sampleSize - 1]];
        const index = Math.ceil(q * sampleSize) - 1;
        return [q, samples[index]];
      });
    };
    const observe = (value, timestamp) => {
      if (this.#maxSize > 0) {
        const target = head % this.#maxSize;
        observations[target] = [timestamp, value];
        head = head + 1;
      }
      count = count + 1;
      sum2 = sum2 + value;
      if (value < min4) {
        min4 = value;
      }
      if (value > max4) {
        max4 = value;
      }
    };
    const get2 = (context2) => {
      const clock = get(context2, ClockRef);
      const quantiles = snapshot(clock.currentTimeMillisUnsafe());
      return {
        quantiles,
        count,
        min: min4,
        max: max4,
        sum: sum2
      };
    };
    const update = ([value, timestamp]) => observe(value, timestamp);
    return makeHooks(get2, update);
  }
}
var update = /* @__PURE__ */ dual(2, (self, input) => contextWith((services) => sync(() => self.updateUnsafe(input, services))));
function makeKey(metric, attributes) {
  let key = `${metric.type}:${metric.id}`;
  if (isNotUndefined(metric.description)) {
    key += `:${metric.description}`;
  }
  if (isNotUndefined(attributes)) {
    key += `:${serializeAttributes(attributes)}`;
  }
  return key;
}
function makeHooks(get2, update2, modify) {
  return {
    get: get2,
    update: update2,
    modify: modify ?? update2
  };
}
function serializeAttributes(attributes) {
  return serializeEntries(Array.isArray(attributes) ? attributes : Object.entries(attributes));
}
function serializeEntries(entries) {
  return entries.map(([key, value]) => `${key}=${value}`).join(",");
}
function mergeAttributes(self, other) {
  return {
    ...attributesToRecord(self),
    ...attributesToRecord(other)
  };
}
function attributesToRecord(attributes) {
  if (isNotUndefined(attributes) && Array.isArray(attributes)) {
    return attributes.reduce((acc, [key, value]) => {
      acc[key] = value;
      return acc;
    }, {});
  }
  return attributes;
}

// node_modules/effect/dist/Effect.js
var TypeId11 = EffectTypeId;
var isEffect2 = isEffect;
var all2 = all;
var partition3 = partition2;
var validate2 = validate;
var findFirst2 = findFirst;
var findFirstFilter2 = findFirstFilter;
var forEach2 = forEach;
var whileLoop2 = whileLoop;
var promise2 = promise;
var tryPromise2 = tryPromise;
var succeed5 = succeed3;
var succeedNone2 = succeedNone;
var succeedSome2 = succeedSome;
var suspend2 = suspend;
var sync2 = sync;
var void_3 = void_;
var undefined_2 = undefined_;
var callback2 = callback;
var never2 = never;
var Do2 = Do;
var bindTo3 = bindTo2;
var let_3 = let_2;
var bind3 = bind2;
var gen2 = gen;
var fail5 = fail3;
var failSync2 = failSync;
var failCause3 = failCause;
var failCauseSync2 = failCauseSync;
var die2 = die;
var try_3 = try_2;
var yieldNow2 = yieldNow;
var yieldNowWith2 = yieldNowWith;
var withFiber2 = withFiber;
var fromResult2 = fromResult;
var fromOption3 = fromOption2;
var fromNullishOr3 = fromNullishOr2;
var flatMap2 = flatMap;
var flatten2 = flatten;
var andThen2 = andThen;
var tap2 = tap;
var result2 = result;
var option2 = option;
var exit2 = exit;
var map5 = map4;
var as2 = as;
var asSome2 = asSome;
var asVoid2 = asVoid;
var flip2 = flip;
var zip2 = zip;
var zipWith2 = zipWith;
var catch_2 = catch_;
var catchTag2 = catchTag;
var catchTags2 = catchTags;
var catchReason2 = catchReason;
var catchReasons2 = catchReasons;
var unwrapReason2 = unwrapReason;
var catchCause2 = catchCause;
var catchDefect2 = catchDefect;
var catchIf2 = catchIf;
var catchFilter2 = catchFilter;
var catchNoSuchElement2 = catchNoSuchElement;
var catchCauseIf2 = catchCauseIf;
var catchCauseFilter2 = catchCauseFilter;
var mapError3 = mapError2;
var mapBoth2 = mapBoth;
var orDie2 = orDie;
var tapError2 = tapError;
var tapErrorTag2 = tapErrorTag;
var tapCause2 = tapCause;
var tapCauseIf2 = tapCauseIf;
var tapCauseFilter2 = tapCauseFilter;
var tapDefect2 = tapDefect;
var eventually2 = eventually;
var retry2 = retry;
var retryOrElse2 = retryOrElse;
var sandbox2 = sandbox;
var ignore2 = ignore;
var ignoreCause2 = ignoreCause;
var withExecutionPlan2 = withExecutionPlan;
var withErrorReporting2 = withErrorReporting;
var orElseSucceed2 = orElseSucceed;
var firstSuccessOf2 = firstSuccessOf;
var timeout2 = timeout;
var timeoutOption2 = timeoutOption;
var timeoutOrElse2 = timeoutOrElse;
var delay2 = delay;
var sleep2 = sleep;
var timed2 = timed;
var raceAll2 = raceAll;
var raceAllFirst2 = raceAllFirst;
var race2 = race;
var raceFirst2 = raceFirst;
var filter5 = filter4;
var filterMap2 = filterMap;
var filterMapEffect2 = filterMapEffect;
var filterOrElse2 = filterOrElse;
var filterMapOrElse2 = filterMapOrElse;
var filterOrFail2 = filterOrFail;
var filterMapOrFail2 = filterMapOrFail;
var when2 = when;
var match5 = match4;
var matchEager2 = matchEager;
var matchCause2 = matchCause;
var matchCauseEager2 = matchCauseEager;
var matchCauseEffectEager2 = matchCauseEffectEager;
var matchCauseEffect2 = matchCauseEffect;
var matchEffect3 = matchEffect;
var isFailure4 = isFailure3;
var isSuccess5 = isSuccess3;
var context2 = context;
var contextWith2 = contextWith;
var provide4 = provide3;
var provideContext2 = provideContext;
var service2 = service;
var serviceOption2 = serviceOption;
var updateContext2 = updateContext;
var updateService2 = updateService;
var provideService2 = provideService;
var provideServiceEffect2 = provideServiceEffect;
var withConcurrency2 = withConcurrency;
var scope2 = scope;
var scoped2 = scoped;
var scopedWith2 = scopedWith;
var acquireRelease2 = acquireRelease;
var acquireDisposable2 = acquireDisposable;
var acquireUseRelease2 = acquireUseRelease;
var addFinalizer3 = addFinalizer;
var ensuring2 = ensuring;
var onError2 = onError;
var onErrorIf2 = onErrorIf;
var onErrorFilter2 = onErrorFilter;
var onExitPrimitive2 = onExitPrimitive;
var onExit2 = onExit;
var onExitIf2 = onExitIf;
var onExitFilter2 = onExitFilter;
var cached2 = cached;
var cachedWithTTL2 = cachedWithTTL;
var cachedInvalidateWithTTL2 = cachedInvalidateWithTTL;
var interrupt2 = interrupt;
var interruptible2 = interruptible;
var onInterrupt2 = onInterrupt;
var uninterruptible2 = uninterruptible;
var uninterruptibleMask2 = uninterruptibleMask;
var interruptibleMask2 = interruptibleMask;
var abortSignal2 = abortSignal;
var forever3 = forever;
var repeat2 = repeat;
var repeatOrElse2 = repeatOrElse;
var replicate2 = replicate;
var replicateEffect2 = replicateEffect;
var schedule = /* @__PURE__ */ dual(2, (self, schedule2) => scheduleFrom2(self, undefined, schedule2));
var scheduleFrom2 = scheduleFrom;
var tracer2 = tracer;
var withTracer2 = withTracer;
var withTracerEnabled2 = withTracerEnabled;
var withTracerTiming2 = withTracerTiming;
var annotateSpans2 = annotateSpans;
var annotateCurrentSpan2 = annotateCurrentSpan;
var currentSpan2 = currentSpan;
var currentParentSpan2 = currentParentSpan;
var spanAnnotations2 = spanAnnotations;
var spanLinks2 = spanLinks;
var linkSpans2 = linkSpans;
var makeSpan2 = makeSpan;
var makeSpanScoped2 = makeSpanScoped;
var useSpan2 = useSpan;
var withSpan2 = withSpan;
var withSpanScoped2 = withSpanScoped;
var withParentSpan2 = withParentSpan;
var request2 = request;
var requestUnsafe2 = requestUnsafe;
var forkChild2 = forkChild;
var forkIn2 = forkIn;
var forkScoped2 = forkScoped;
var forkDetach2 = forkDetach;
var awaitAllChildren2 = awaitAllChildren;
var fiber2 = fiber;
var fiberId2 = fiberId;
var runFork2 = runFork;
var runForkWith2 = runForkWith;
var runCallbackWith2 = runCallbackWith;
var runCallback2 = runCallback;
var runPromise2 = runPromise;
var runPromiseWith2 = runPromiseWith;
var runPromiseExit2 = runPromiseExit;
var runPromiseExitWith2 = runPromiseExitWith;
var runSync2 = runSync;
var runSyncWith2 = runSyncWith;
var runSyncExit2 = runSyncExit;
var runSyncExitWith2 = runSyncExitWith;
var fnUntraced2 = fnUntraced;
var fn2 = fn;
var clockWith2 = clockWith;
var logWithLevel2 = logWithLevel;
var log = /* @__PURE__ */ logWithLevel();
var logFatal = /* @__PURE__ */ logWithLevel("Fatal");
var logWarning = /* @__PURE__ */ logWithLevel("Warn");
var logError = /* @__PURE__ */ logWithLevel("Error");
var logInfo = /* @__PURE__ */ logWithLevel("Info");
var logDebug = /* @__PURE__ */ logWithLevel("Debug");
var logTrace = /* @__PURE__ */ logWithLevel("Trace");
var withLogger = /* @__PURE__ */ dual(2, (effect2, logger) => updateService(effect2, CurrentLoggers, (loggers) => new Set([...loggers, logger])));
var annotateLogs = /* @__PURE__ */ dual((args2) => isEffect2(args2[0]), (effect2, ...args2) => updateService(effect2, CurrentLogAnnotations2, (annotations) => {
  const newAnnotations = {
    ...annotations
  };
  if (args2.length === 1) {
    Object.assign(newAnnotations, args2[0]);
  } else {
    newAnnotations[args2[0]] = args2[1];
  }
  return newAnnotations;
}));
var annotateLogsScoped2 = annotateLogsScoped;
var withLogSpan = /* @__PURE__ */ dual(2, (effect2, label) => flatMap(currentTimeMillis, (now) => updateService(effect2, CurrentLogSpans2, (spans) => {
  const span = [label, now];
  return [span, ...spans];
})));
var track = /* @__PURE__ */ dual((args2) => isEffect2(args2[0]), (self, metric, f) => onExit2(self, (exit3) => {
  const input = f === undefined ? exit3 : internalCall(() => f(exit3));
  return update(metric, input);
}));
var trackSuccesses = /* @__PURE__ */ dual((args2) => isEffect2(args2[0]), (self, metric, f) => tap2(self, (value) => {
  const input = f === undefined ? value : f(value);
  return update(metric, input);
}));
var trackErrors = /* @__PURE__ */ dual((args2) => isEffect2(args2[0]), (self, metric, f) => tapError2(self, (error) => {
  const input = f === undefined ? error : internalCall(() => f(error));
  return update(metric, input);
}));
var trackDefects = /* @__PURE__ */ dual((args2) => isEffect2(args2[0]), (self, metric, f) => tapDefect2(self, (defect) => {
  const input = f === undefined ? defect : internalCall(() => f(defect));
  return update(metric, input);
}));
var trackDuration = /* @__PURE__ */ dual((args2) => isEffect2(args2[0]), (self, metric, f) => clockWith2((clock) => {
  const startTime = clock.currentTimeNanosUnsafe();
  return onExit2(self, () => {
    const endTime = clock.currentTimeNanosUnsafe();
    const duration = subtract(fromInputUnsafe(endTime), fromInputUnsafe(startTime));
    const input = f === undefined ? duration : internalCall(() => f(duration));
    return update(metric, input);
  });
}));

class Transaction extends (/* @__PURE__ */ Service()("effect/Effect/Transaction")) {
}
var tx = (effect2) => withFiber2((fiber3) => {
  if (fiber3.context.mapUnsafe.has(Transaction.key)) {
    return effect2;
  }
  const state = {
    journal: new Map,
    retry: false
  };
  let result3;
  return uninterruptibleMask2((restore) => flatMap2(whileLoop2({
    while: () => !result3,
    body: constant(restore(effect2).pipe(provideService2(Transaction, state), tapCause2(() => {
      if (!state.retry)
        return void_3;
      return restore(awaitPendingTransaction(state));
    }), exit2)),
    step(exit3) {
      if (state.retry || !isTransactionConsistent(state)) {
        return clearTransaction(state);
      }
      if (isSuccess4(exit3)) {
        commitTransaction(fiber3, state);
      } else {
        clearTransaction(state);
      }
      result3 = exit3;
    }
  }), () => result3));
});
var isTransactionConsistent = (state) => {
  for (const [ref, {
    version: version2
  }] of state.journal) {
    if (ref.version !== version2) {
      return false;
    }
  }
  return true;
};
var awaitPendingTransaction = (state) => suspend2(() => {
  const key = {};
  const refs = Array.from(state.journal.keys());
  const clearPending = () => {
    for (const clear of refs) {
      clear.pending.delete(key);
    }
  };
  return callback2((resume) => {
    const onCall = () => {
      clearPending();
      resume(void_3);
    };
    for (const ref of refs) {
      ref.pending.set(key, onCall);
    }
    return sync2(clearPending);
  });
});
function commitTransaction(fiber3, state) {
  for (const [ref, {
    value
  }] of state.journal) {
    if (value !== ref.value) {
      ref.version = ref.version + 1;
      ref.value = value;
    }
    for (const pending of ref.pending.values()) {
      fiber3.currentDispatcher.scheduleTask(pending, 0);
    }
    ref.pending.clear();
  }
}
function clearTransaction(state) {
  state.retry = false;
  state.journal.clear();
}
var txRetry = /* @__PURE__ */ flatMap2(Transaction, (state) => {
  state.retry = true;
  return interrupt2;
});
var effectify = (fn3, onError3, onSyncError) => (...args2) => callback2((resume) => {
  try {
    fn3(...args2, (err, result3) => {
      if (err) {
        resume(fail5(onError3 ? onError3(err, args2) : err));
      } else {
        resume(succeed5(result3));
      }
    });
  } catch (err) {
    resume(onSyncError ? fail5(onSyncError(err, args2)) : die2(err));
  }
});
var satisfiesSuccessType = () => (effect2) => effect2;
var satisfiesErrorType = () => (effect2) => effect2;
var satisfiesServicesType = () => (effect2) => effect2;
var mapEager2 = mapEager;
var mapErrorEager2 = mapErrorEager;
var mapBothEager2 = mapBothEager;
var flatMapEager2 = flatMapEager;
var catchEager2 = catchEager;
var fnUntracedEager2 = fnUntracedEager;
// node_modules/effect/dist/unstable/http/FetchHttpClient.js
var exports_FetchHttpClient = {};
__export(exports_FetchHttpClient, {
  layer: () => layer,
  RequestInit: () => RequestInit,
  Fetch: () => Fetch
});

// node_modules/effect/dist/Fiber.js
var TypeId12 = `~effect/Fiber/${version}`;
var interrupt3 = fiberInterrupt;
var getCurrent = getCurrentFiber;

// node_modules/effect/dist/Latch.js
var makeUnsafe4 = makeLatchUnsafe;

// node_modules/effect/dist/Channel.js
var TypeId13 = "~effect/Channel";
var ChannelProto = {
  [TypeId13]: {
    _Env: identity,
    _InErr: identity,
    _InElem: identity,
    _OutErr: identity,
    _OutElem: identity
  },
  pipe() {
    return pipeArguments(this, arguments);
  }
};
var fromTransform = (transform) => {
  const self = Object.create(ChannelProto);
  self.transform = (upstream, scope3) => catchCause2(transform(upstream, scope3), (cause) => succeed5(failCause3(cause)));
  return self;
};
var fromPull = (effect2) => fromTransform((_, __) => effect2);
var fromTransformBracket = (f) => fromTransform(fnUntraced2(function* (upstream, scope3) {
  const closableScope = forkUnsafe2(scope3);
  const onCause = (cause) => close(closableScope, doneExitFromCause(cause));
  const pull = yield* onError2(f(upstream, scope3, closableScope), onCause);
  return onError2(pull, onCause);
}));
var toTransform = (channel) => channel.transform;
var suspend3 = (evaluate2) => fromTransform((upstream, scope3) => suspend2(() => toTransform(evaluate2())(upstream, scope3)));
var fail6 = (error) => fromPull(succeed5(fail5(error)));
var onExit3 = /* @__PURE__ */ dual(2, (self, finalizer) => fromTransformBracket((upstream, scope3, forkedScope) => addFinalizerExit(forkedScope, finalizer).pipe(andThen2(toTransform(self)(upstream, scope3)))));
var ensuring3 = /* @__PURE__ */ dual(2, (self, finalizer) => onExit3(self, (_) => finalizer));
var runWith = (self, f, onHalt) => suspend2(() => {
  const scope3 = makeUnsafe3();
  const makePull = toTransform(self)(done3(), scope3);
  return catchDone(flatMap2(makePull, f), onHalt ? onHalt : succeed5).pipe(onExit2((exit3) => close(scope3, exit3)));
});
var runForEach = /* @__PURE__ */ dual(2, (self, f) => runWith(self, (pull) => forever3(flatMap2(pull, f), {
  disableYield: true
})));

// node_modules/effect/dist/internal/stream.js
var TypeId14 = "~effect/Stream";
var streamVariance = {
  _R: identity,
  _E: identity,
  _A: identity
};
var StreamProto = {
  [TypeId14]: streamVariance,
  pipe() {
    return pipeArguments(this, arguments);
  }
};
var fromChannel = (channel) => {
  const self = Object.create(StreamProto);
  self.channel = channel;
  return self;
};

// node_modules/effect/dist/Stream.js
var TypeId15 = "~effect/Stream";
var isStream = (u) => hasProperty(u, TypeId15);
var fromChannel2 = fromChannel;
var suspend4 = (stream) => fromChannel2(suspend3(() => stream().channel));
var fail7 = (error) => fromChannel2(fail6(error));
var fromReadableStream = (options) => fromChannel2(fromTransform(fnUntraced2(function* (_, scope3) {
  const reader = options.evaluate().getReader();
  yield* addFinalizer2(scope3, options.releaseLockOnEnd ? sync2(() => reader.releaseLock()) : promise2(() => reader.cancel()));
  return flatMap2(tryPromise2({
    try: () => reader.read(),
    catch: (reason) => options.onError(reason)
  }), ({
    done: done4,
    value
  }) => done4 ? done3() : succeed5(of(value)));
})));
var ensuring4 = /* @__PURE__ */ dual(2, (self, finalizer) => fromChannel2(ensuring3(self.channel, finalizer)));
var runForEachArray = /* @__PURE__ */ dual(2, (self, f) => runForEach(self.channel, f));
var toReadableStreamWith = /* @__PURE__ */ dual((args2) => isStream(args2[0]), (self, context3, options) => {
  let currentResolve = undefined;
  let fiber3 = undefined;
  const latch = makeUnsafe4(false);
  return new ReadableStream({
    start(controller) {
      fiber3 = runFork2(provideContext2(runForEachArray(self, (chunk) => latch.whenOpen(sync2(() => {
        latch.closeUnsafe();
        for (let i = 0;i < chunk.length; i++) {
          controller.enqueue(chunk[i]);
        }
        currentResolve();
        currentResolve = undefined;
      }))), context3));
      fiber3.addObserver((exit3) => {
        if (exit3._tag === "Failure") {
          controller.error(squash(exit3.cause));
        } else {
          controller.close();
        }
      });
    },
    pull() {
      return new Promise((resolve) => {
        currentResolve = resolve;
        latch.openUnsafe();
      });
    },
    cancel() {
      if (!fiber3)
        return;
      return runPromise2(asVoid2(interrupt3(fiber3)));
    }
  }, options?.strategy);
});
var toReadableStreamEffect = /* @__PURE__ */ dual((args2) => isStream(args2[0]), (self, options) => map5(context2(), (context3) => toReadableStreamWith(self, context3, options)));

// node_modules/effect/dist/internal/redacted.js
var redactedRegistry = /* @__PURE__ */ new WeakMap;
var value = (self) => {
  if (redactedRegistry.has(self)) {
    return redactedRegistry.get(self);
  } else {
    throw new Error("Unable to get redacted value" + (self.label ? ` with label: "${self.label}"` : ""));
  }
};
var stringOrRedacted = (val) => typeof val === "string" ? val : value(val);

// node_modules/effect/dist/Redacted.js
var TypeId16 = "~effect/data/Redacted";
var isRedacted = (u) => hasProperty(u, TypeId16);
var make8 = (value2, options) => {
  const self = Object.create(Proto3);
  if (options?.label) {
    self.label = options.label;
  }
  redactedRegistry.set(self, value2);
  return self;
};
var Proto3 = {
  [TypeId16]: {
    _A: (_) => _
  },
  label: undefined,
  ...PipeInspectableProto,
  toJSON() {
    return this.toString();
  },
  toString() {
    return `<redacted${isString(this.label) ? ":" + this.label : ""}>`;
  },
  [symbol]() {
    return hash(redactedRegistry.get(this));
  },
  [symbol2](that) {
    return isRedacted(that) && equals(redactedRegistry.get(this), redactedRegistry.get(that));
  }
};

// node_modules/effect/dist/Encoding.js
var EncodingErrorTypeId = "~effect/encoding/EncodingError";

class EncodingError extends (/* @__PURE__ */ TaggedError2("EncodingError")) {
  [EncodingErrorTypeId] = EncodingErrorTypeId;
}
var encodeBase64 = (input) => typeof input === "string" ? base64EncodeUint8Array(encoder.encode(input)) : base64EncodeUint8Array(input);
var decodeBase64 = (str) => {
  const stripped = stripCrlf(str);
  const length = stripped.length;
  if (length % 4 !== 0) {
    return fail2(new EncodingError({
      kind: "Decode",
      module: "Base64",
      input: stripped,
      message: `Length must be a multiple of 4, but is ${length}`
    }));
  }
  const index = stripped.indexOf("=");
  if (index !== -1 && (index < length - 2 || index === length - 2 && stripped[length - 1] !== "=")) {
    return fail2(new EncodingError({
      kind: "Decode",
      module: "Base64",
      input: stripped,
      message: `Found a '=' character, but it is not at the end`
    }));
  }
  try {
    const missingOctets = stripped.endsWith("==") ? 2 : stripped.endsWith("=") ? 1 : 0;
    const result3 = new Uint8Array(3 * (length / 4) - missingOctets);
    for (let i = 0, j = 0;i < length; i += 4, j += 3) {
      const buffer2 = getBase64Code(stripped.charCodeAt(i)) << 18 | getBase64Code(stripped.charCodeAt(i + 1)) << 12 | getBase64Code(stripped.charCodeAt(i + 2)) << 6 | getBase64Code(stripped.charCodeAt(i + 3));
      result3[j] = buffer2 >> 16;
      result3[j + 1] = buffer2 >> 8 & 255;
      result3[j + 2] = buffer2 & 255;
    }
    return succeed2(result3);
  } catch (e) {
    return fail2(new EncodingError({
      kind: "Decode",
      module: "Base64",
      input: stripped,
      message: e instanceof Error ? e.message : "Invalid input"
    }));
  }
};
var encoder = /* @__PURE__ */ new TextEncoder;
var stripCrlf = (str) => str.replace(/[\n\r]/g, "");
var base64EncodeUint8Array = (bytes) => {
  const length = bytes.length;
  let result3 = "";
  let i;
  for (i = 2;i < length; i += 3) {
    result3 += base64abc[bytes[i - 2] >> 2];
    result3 += base64abc[(bytes[i - 2] & 3) << 4 | bytes[i - 1] >> 4];
    result3 += base64abc[(bytes[i - 1] & 15) << 2 | bytes[i] >> 6];
    result3 += base64abc[bytes[i] & 63];
  }
  if (i === length + 1) {
    result3 += base64abc[bytes[i - 2] >> 2];
    result3 += base64abc[(bytes[i - 2] & 3) << 4];
    result3 += "==";
  }
  if (i === length) {
    result3 += base64abc[bytes[i - 2] >> 2];
    result3 += base64abc[(bytes[i - 2] & 3) << 4 | bytes[i - 1] >> 4];
    result3 += base64abc[(bytes[i - 1] & 15) << 2];
    result3 += "=";
  }
  return result3;
};
function getBase64Code(charCode) {
  if (charCode >= base64codes.length) {
    throw new TypeError(`Invalid character ${String.fromCharCode(charCode)}`);
  }
  const code = base64codes[charCode];
  if (code === 255) {
    throw new TypeError(`Invalid character ${String.fromCharCode(charCode)}`);
  }
  return code;
}
var base64abc = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z", "a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l", "m", "n", "o", "p", "q", "r", "s", "t", "u", "v", "w", "x", "y", "z", "0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "+", "/"];
var base64codes = [255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 62, 255, 255, 255, 63, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 255, 255, 255, 0, 255, 255, 255, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 255, 255, 255, 255, 255, 255, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51];

// node_modules/effect/dist/internal/schema/annotations.js
function resolve(ast) {
  return ast.checks ? ast.checks[ast.checks.length - 1].annotations : ast.annotations;
}
function resolveAt(key) {
  return (ast) => resolve(ast)?.[key];
}
var resolveIdentifier = /* @__PURE__ */ resolveAt("identifier");
var getExpected = /* @__PURE__ */ memoize((ast) => {
  const identifier2 = resolveIdentifier(ast);
  if (typeof identifier2 === "string")
    return identifier2;
  return ast.getExpected(getExpected);
});

// node_modules/effect/dist/internal/record.js
function set(self, key, value2) {
  if (key === "__proto__") {
    Object.defineProperty(self, key, {
      value: value2,
      writable: true,
      enumerable: true,
      configurable: true
    });
  } else {
    self[key] = value2;
  }
  return self;
}

// node_modules/effect/dist/RegExp.js
var RegExp3 = globalThis.RegExp;
var escape = (string2) => string2.replace(/[/\\^$*+?.()|[\]{}]/g, "\\$&");

// node_modules/effect/dist/SchemaIssue.js
var TypeId17 = "~effect/SchemaIssue/Issue";
function isIssue(u) {
  return hasProperty(u, TypeId17);
}

class Base {
  [TypeId17] = TypeId17;
  toString() {
    return defaultFormatter(this);
  }
}

class Filter2 extends Base {
  _tag = "Filter";
  actual;
  filter;
  issue;
  constructor(actual, filter7, issue) {
    super();
    this.actual = actual;
    this.filter = filter7;
    this.issue = issue;
  }
}

class Encoding2 extends Base {
  _tag = "Encoding";
  ast;
  actual;
  issue;
  constructor(ast, actual, issue) {
    super();
    this.ast = ast;
    this.actual = actual;
    this.issue = issue;
  }
}

class Pointer extends Base {
  _tag = "Pointer";
  path;
  issue;
  constructor(path, issue) {
    super();
    this.path = path;
    this.issue = issue;
  }
}

class MissingKey extends Base {
  _tag = "MissingKey";
  annotations;
  constructor(annotations) {
    super();
    this.annotations = annotations;
  }
}

class UnexpectedKey extends Base {
  _tag = "UnexpectedKey";
  ast;
  actual;
  constructor(ast, actual) {
    super();
    this.ast = ast;
    this.actual = actual;
  }
}

class Composite extends Base {
  _tag = "Composite";
  ast;
  actual;
  issues;
  constructor(ast, actual, issues) {
    super();
    this.ast = ast;
    this.actual = actual;
    this.issues = issues;
  }
}

class InvalidType extends Base {
  _tag = "InvalidType";
  ast;
  actual;
  constructor(ast, actual) {
    super();
    this.ast = ast;
    this.actual = actual;
  }
}

class InvalidValue extends Base {
  _tag = "InvalidValue";
  actual;
  annotations;
  constructor(actual, annotations) {
    super();
    this.actual = actual;
    this.annotations = annotations;
  }
}
class AnyOf extends Base {
  _tag = "AnyOf";
  ast;
  actual;
  issues;
  constructor(ast, actual, issues) {
    super();
    this.ast = ast;
    this.actual = actual;
    this.issues = issues;
  }
}

class OneOf extends Base {
  _tag = "OneOf";
  ast;
  actual;
  successes;
  constructor(ast, actual, successes) {
    super();
    this.ast = ast;
    this.actual = actual;
    this.successes = successes;
  }
}
function makeFilterIssue(input, entry) {
  if (isIssue(entry)) {
    return entry;
  }
  if (typeof entry === "string") {
    return new InvalidValue(some2(input), {
      message: entry
    });
  }
  const inner = typeof entry.issue === "string" ? new InvalidValue(some2(input), {
    message: entry.issue
  }) : entry.issue;
  return new Pointer(entry.path, inner);
}
function makeSingle(input, out) {
  if (out === undefined) {
    return;
  }
  if (typeof out === "boolean") {
    return out ? undefined : new InvalidValue(some2(input));
  }
  return makeFilterIssue(input, out);
}
function make9(input, ast, out) {
  if (Array.isArray(out)) {
    if (isReadonlyArrayNonEmpty(out)) {
      if (out.length === 1) {
        return makeFilterIssue(input, out[0]);
      }
      return new Composite(ast, some2(input), map3(out, (entry) => makeFilterIssue(input, entry)));
    }
    return;
  }
  return makeSingle(input, out);
}
var defaultLeafHook = (issue) => {
  const message = findMessage(issue);
  if (message !== undefined)
    return message;
  switch (issue._tag) {
    case "InvalidType":
      return getExpectedMessage(getExpected(issue.ast), formatOption(issue.actual));
    case "InvalidValue":
      return `Invalid data ${formatOption(issue.actual)}`;
    case "MissingKey":
      return "Missing key";
    case "UnexpectedKey":
      return `Unexpected key with value ${format(issue.actual)}`;
    case "Forbidden":
      return "Forbidden operation";
    case "OneOf":
      return `Expected exactly one member to match the input ${format(issue.actual)}`;
  }
};
var defaultCheckHook = (issue) => {
  return findMessage(issue.issue) ?? findMessage(issue);
};
function getExpectedMessage(expected, actual) {
  return `Expected ${expected}, got ${actual}`;
}
function toDefaultIssues(issue, path, leafHook, checkHook) {
  switch (issue._tag) {
    case "Filter": {
      const message = checkHook(issue);
      if (message !== undefined) {
        return [{
          path,
          message
        }];
      }
      switch (issue.issue._tag) {
        case "InvalidValue":
          return [{
            path,
            message: getExpectedMessage(formatCheck(issue.filter), format(issue.actual))
          }];
        default:
          return toDefaultIssues(issue.issue, path, leafHook, checkHook);
      }
    }
    case "Encoding":
      return toDefaultIssues(issue.issue, path, leafHook, checkHook);
    case "Pointer":
      return toDefaultIssues(issue.issue, [...path, ...issue.path], leafHook, checkHook);
    case "Composite":
      return issue.issues.flatMap((issue2) => toDefaultIssues(issue2, path, leafHook, checkHook));
    case "AnyOf": {
      const message = findMessage(issue);
      if (issue.issues.length === 0) {
        if (message !== undefined)
          return [{
            path,
            message
          }];
        const expected = getExpectedMessage(getExpected(issue.ast), format(issue.actual));
        return [{
          path,
          message: expected
        }];
      }
      return issue.issues.flatMap((issue2) => toDefaultIssues(issue2, path, leafHook, checkHook));
    }
    default:
      return [{
        path,
        message: leafHook(issue)
      }];
  }
}
function formatCheck(check) {
  const expected = check.annotations?.expected;
  if (typeof expected === "string")
    return expected;
  switch (check._tag) {
    case "Filter":
      return "<filter>";
    case "FilterGroup":
      return check.checks.map((check2) => formatCheck(check2)).join(" & ");
  }
}
function makeFormatterDefault() {
  return (issue) => toDefaultIssues(issue, [], defaultLeafHook, defaultCheckHook).map(formatDefaultIssue).join(`
`);
}
var defaultFormatter = /* @__PURE__ */ makeFormatterDefault();
function formatDefaultIssue(issue) {
  let out = issue.message;
  if (issue.path && issue.path.length > 0) {
    const path = formatPath(issue.path);
    out += `
  at ${path}`;
  }
  return out;
}
function findMessage(issue) {
  switch (issue._tag) {
    case "InvalidType":
    case "OneOf":
    case "Composite":
    case "AnyOf":
      return getMessageAnnotation(issue.ast.annotations);
    case "InvalidValue":
    case "Forbidden":
      return getMessageAnnotation(issue.annotations);
    case "MissingKey":
      return getMessageAnnotation(issue.annotations, "messageMissingKey");
    case "UnexpectedKey":
      return getMessageAnnotation(issue.ast.annotations, "messageUnexpectedKey");
    case "Filter":
      return getMessageAnnotation(issue.filter.annotations);
    case "Encoding":
      return findMessage(issue.issue);
  }
}
function getMessageAnnotation(annotations, type = "message") {
  const message = annotations?.[type];
  if (typeof message === "string")
    return message;
}
function formatOption(actual) {
  if (isNone2(actual))
    return "no value provided";
  return format(actual.value);
}

// node_modules/effect/dist/SchemaGetter.js
class Getter extends Class {
  run;
  constructor(run) {
    super();
    this.run = run;
  }
  map(f) {
    return new Getter((oe, options) => this.run(oe, options).pipe(mapEager2(map(f))));
  }
  compose(other) {
    if (isPassthrough(this)) {
      return other;
    }
    if (isPassthrough(other)) {
      return this;
    }
    return new Getter((oe, options) => this.run(oe, options).pipe(flatMapEager2((ot) => other.run(ot, options))));
  }
}
var passthrough_ = /* @__PURE__ */ new Getter(succeed5);
function isPassthrough(getter) {
  return getter.run === passthrough_.run;
}
function passthrough2() {
  return passthrough_;
}
function onSome(f) {
  return new Getter((oe, options) => isNone2(oe) ? succeedNone2 : f(oe.value, options));
}
function transform(f) {
  return transformOptional(map(f));
}
function transformOrFail(f) {
  return onSome((e, options) => f(e, options).pipe(mapEager2(some2)));
}
function transformOptional(f) {
  return new Getter((oe) => succeed5(f(oe)));
}
function withDefault(defaultValue) {
  return new Getter((o) => {
    const filtered = filter(o, isNotUndefined);
    return isSome2(filtered) ? succeed5(filtered) : mapEager2(defaultValue, some2);
  });
}
function String3() {
  return transform(globalThis.String);
}
function Number4() {
  return transform(globalThis.Number);
}
function Date2() {
  return transform((u) => new globalThis.Date(u));
}
function encodeBase642() {
  return transform(encodeBase64);
}
function decodeBase642() {
  return transformOrFail((input) => mapErrorEager2(fromResult2(decodeBase64(input)), (e) => new InvalidValue(some2(input), {
    message: e.message
  })));
}

// node_modules/effect/dist/SchemaTransformation.js
var TypeId18 = "~effect/SchemaTransformation/Transformation";

class Transformation {
  [TypeId18] = TypeId18;
  _tag = "Transformation";
  decode;
  encode;
  constructor(decode, encode) {
    this.decode = decode;
    this.encode = encode;
  }
  flip() {
    return new Transformation(this.encode, this.decode);
  }
  compose(other) {
    return new Transformation(this.decode.compose(other.decode), other.encode.compose(this.encode));
  }
}
function isTransformation(u) {
  return hasProperty(u, TypeId18);
}
var make10 = (options) => {
  if (isTransformation(options)) {
    return options;
  }
  return new Transformation(options.decode, options.encode);
};
function transformOrFail2(options) {
  return new Transformation(transformOrFail(options.decode), transformOrFail(options.encode));
}
function transform2(options) {
  return new Transformation(transform(options.decode), transform(options.encode));
}
var passthrough_2 = /* @__PURE__ */ new Transformation(/* @__PURE__ */ passthrough2(), /* @__PURE__ */ passthrough2());
function passthrough3() {
  return passthrough_2;
}
var numberFromString = /* @__PURE__ */ new Transformation(/* @__PURE__ */ Number4(), /* @__PURE__ */ String3());
var dateFromString = /* @__PURE__ */ new Transformation(/* @__PURE__ */ Date2(), /* @__PURE__ */ transform(formatDate));
var errorFromErrorJsonEncoded = (options) => transform2({
  decode: (i) => {
    const err = new Error(i.message);
    if (typeof i.name === "string" && i.name !== "Error")
      err.name = i.name;
    if (typeof i.stack === "string")
      err.stack = i.stack;
    return err;
  },
  encode: (a) => {
    const e = {
      name: a.name,
      message: a.message
    };
    if (options?.includeStack && typeof a.stack === "string") {
      e.stack = a.stack;
    }
    return e;
  }
});
var urlFromString = /* @__PURE__ */ transformOrFail2({
  decode: (s) => try_3({
    try: () => new URL(s),
    catch: () => new InvalidValue(some2(s), {
      message: `Invalid URL string: ${s}`
    })
  }),
  encode: (url) => succeed5(url.href)
});
var uint8ArrayFromBase64String = /* @__PURE__ */ new Transformation(/* @__PURE__ */ decodeBase642(), /* @__PURE__ */ encodeBase642());

// node_modules/effect/dist/SchemaAST.js
function makeGuard(tag) {
  return (ast) => ast._tag === tag;
}
var isDeclaration = /* @__PURE__ */ makeGuard("Declaration");
var isNever2 = /* @__PURE__ */ makeGuard("Never");
var isLiteral = /* @__PURE__ */ makeGuard("Literal");
var isUniqueSymbol = /* @__PURE__ */ makeGuard("UniqueSymbol");
var isArrays = /* @__PURE__ */ makeGuard("Arrays");
var isObjects = /* @__PURE__ */ makeGuard("Objects");
var isUnion = /* @__PURE__ */ makeGuard("Union");
class Link {
  to;
  transformation;
  constructor(to, transformation) {
    this.to = to;
    this.transformation = transformation;
  }
}
var defaultParseOptions = {};

class Context2 {
  isOptional;
  isMutable;
  defaultValue;
  annotations;
  constructor(isOptional, isMutable, defaultValue = undefined, annotations = undefined) {
    this.isOptional = isOptional;
    this.isMutable = isMutable;
    this.defaultValue = defaultValue;
    this.annotations = annotations;
  }
}
var TypeId19 = "~effect/Schema";

class Base2 {
  [TypeId19] = TypeId19;
  annotations;
  checks;
  encoding;
  context;
  constructor(annotations = undefined, checks = undefined, encoding = undefined, context3 = undefined) {
    this.annotations = annotations;
    this.checks = checks;
    this.encoding = encoding;
    this.context = context3;
  }
  toString() {
    return `<${this._tag}>`;
  }
}

class Declaration extends Base2 {
  _tag = "Declaration";
  typeParameters;
  run;
  constructor(typeParameters, run, annotations, checks, encoding, context3) {
    super(annotations, checks, encoding, context3);
    this.typeParameters = typeParameters;
    this.run = run;
  }
  getParser() {
    const run = this.run(this.typeParameters);
    return (oinput, options) => {
      if (isNone2(oinput))
        return succeedNone2;
      return mapEager2(run(oinput.value, this, options), some2);
    };
  }
  recur(recur) {
    const tps = mapOrSame(this.typeParameters, recur);
    return tps === this.typeParameters ? this : new Declaration(tps, this.run, this.annotations, this.checks, undefined, this.context);
  }
  getExpected() {
    const expected = this.annotations?.expected;
    if (typeof expected === "string")
      return expected;
    return "<Declaration>";
  }
}

class Null extends Base2 {
  _tag = "Null";
  getParser() {
    return fromConst(this, null);
  }
  getExpected() {
    return "null";
  }
}
var null_ = /* @__PURE__ */ new Null;
class Unknown extends Base2 {
  _tag = "Unknown";
  getParser() {
    return fromRefinement(this, isUnknown);
  }
  getExpected() {
    return "unknown";
  }
}
var unknown = /* @__PURE__ */ new Unknown;
class Literal extends Base2 {
  _tag = "Literal";
  literal;
  constructor(literal, annotations, checks, encoding, context3) {
    super(annotations, checks, encoding, context3);
    if (typeof literal === "number" && !globalThis.Number.isFinite(literal)) {
      throw new Error(`A numeric literal must be finite, got ${format(literal)}`);
    }
    this.literal = literal;
  }
  getParser() {
    return fromConst(this, this.literal);
  }
  toCodecJson() {
    return typeof this.literal === "bigint" ? literalToString(this) : this;
  }
  toCodecStringTree() {
    return typeof this.literal === "string" ? this : literalToString(this);
  }
  getExpected() {
    return typeof this.literal === "string" ? JSON.stringify(this.literal) : globalThis.String(this.literal);
  }
}
function literalToString(ast) {
  const literalAsString = globalThis.String(ast.literal);
  return replaceEncoding(ast, [new Link(new Literal(literalAsString), new Transformation(transform(() => ast.literal), transform(() => literalAsString)))]);
}

class String4 extends Base2 {
  _tag = "String";
  getParser() {
    return fromRefinement(this, isString);
  }
  getExpected() {
    return "string";
  }
}
var string2 = /* @__PURE__ */ new String4;

class Number5 extends Base2 {
  _tag = "Number";
  getParser() {
    return fromRefinement(this, isNumber);
  }
  toCodecJson() {
    if (this.checks && (hasCheck(this.checks, "isFinite") || hasCheck(this.checks, "isInt"))) {
      return this;
    }
    return replaceEncoding(this, [numberToJson]);
  }
  toCodecStringTree() {
    if (this.checks && (hasCheck(this.checks, "isFinite") || hasCheck(this.checks, "isInt"))) {
      return replaceEncoding(this, [finiteToString]);
    }
    return replaceEncoding(this, [numberToString]);
  }
  getExpected() {
    return "number";
  }
}
function hasCheck(checks, tag) {
  return checks.some((c) => {
    switch (c._tag) {
      case "Filter":
        return c.annotations?.meta?._tag === tag;
      case "FilterGroup":
        return hasCheck(c.checks, tag);
    }
  });
}
var number2 = /* @__PURE__ */ new Number5;
class Arrays extends Base2 {
  _tag = "Arrays";
  isMutable;
  elements;
  rest;
  constructor(isMutable, elements, rest, annotations, checks, encoding, context3) {
    super(annotations, checks, encoding, context3);
    this.isMutable = isMutable;
    this.elements = elements;
    this.rest = rest;
    const i = elements.findIndex(isOptional);
    if (i !== -1 && (elements.slice(i + 1).some((e) => !isOptional(e)) || rest.length > 1)) {
      throw new Error("A required element cannot follow an optional element. ts(1257)");
    }
    if (rest.length > 1 && rest.slice(1).some(isOptional)) {
      throw new Error("An optional element cannot follow a rest element. ts(1266)");
    }
  }
  getParser(recur) {
    const ast = this;
    const elements = ast.elements.map((ast2) => ({
      ast: ast2,
      parser: recur(ast2)
    }));
    const rest = ast.rest.map((ast2) => ({
      ast: ast2,
      parser: recur(ast2)
    }));
    const elementLen = elements.length;
    const [head, ...tail] = rest;
    const tailLen = tail.length;
    function getParser(tailThreshold, index) {
      if (index < elementLen) {
        return elements[index];
      } else if (index >= tailThreshold) {
        return tail[index - tailThreshold];
      }
      return head;
    }
    return fnUntracedEager2(function* (oinput, options) {
      if (oinput._tag === "None") {
        return oinput;
      }
      const input = oinput.value;
      if (!Array.isArray(input)) {
        return yield* fail5(new InvalidType(ast, oinput));
      }
      const len = input.length;
      const state = {
        ast,
        getParser,
        oinput,
        len,
        tailThreshold: resolveTailThreshold(len, elementLen, tailLen),
        output: new globalThis.Array(len),
        issues: undefined,
        options
      };
      const concurrency = resolveConcurrency(options?.concurrency);
      const eff = parseArray(state, input, {
        concurrency: concurrency?.concurrency,
        end: ast.rest.length === 0 ? elementLen : Math.max(len, elementLen + tailLen)
      });
      if (eff)
        yield* eff;
      if (ast.rest.length === 0 && len > elementLen) {
        for (let i = elementLen;i <= len - 1; i++) {
          const issue = new Pointer([i], new UnexpectedKey(ast, input[i]));
          if (options.errors === "all") {
            if (state.issues)
              state.issues.push(issue);
            else
              state.issues = [issue];
          } else {
            return yield* fail5(new Composite(ast, oinput, [issue]));
          }
        }
      }
      if (state.issues) {
        return yield* fail5(new Composite(ast, oinput, state.issues));
      }
      return some2(state.output);
    });
  }
  recur(recur) {
    const elements = mapOrSame(this.elements, recur);
    const rest = mapOrSame(this.rest, recur);
    return elements === this.elements && rest === this.rest ? this : new Arrays(this.isMutable, elements, rest, this.annotations, this.checks, undefined, this.context);
  }
  getExpected() {
    return "array";
  }
}
var parseArray = /* @__PURE__ */ iterateEager()({
  onItem(s, item, i) {
    const value2 = i < s.len ? some2(item) : none2();
    return s.getParser(s.tailThreshold, i).parser(value2, s.options);
  },
  step(s, _, exit3, i) {
    if (exit3._tag === "Failure") {
      return wrapPropertyKeyIssue(s, s.ast, i, exit3);
    } else if (exit3.value._tag === "Some") {
      s.output[i] = exit3.value.value;
    } else {
      const p = s.getParser(s.tailThreshold, i);
      if (isOptional(p.ast))
        return;
      const issue = new Pointer([i], new MissingKey(p.ast.context?.annotations));
      if (s.options.errors === "all") {
        if (s.issues)
          s.issues.push(issue);
        else
          s.issues = [issue];
      } else {
        return fail4(new Composite(s.ast, s.oinput, [issue]));
      }
    }
  }
});
function resolveTailThreshold(inputLen, elementLen, tailLen) {
  return Math.max(elementLen, inputLen - tailLen);
}
var resolveConcurrency = (value2) => {
  value2 = value2 === "unbounded" ? Infinity : value2 ?? 1;
  return value2 > 1 ? {
    concurrency: value2
  } : undefined;
};
var wrapPropertyKeyIssue = (s, ast, key, exit3) => {
  const issueResult = findError2(exit3.cause);
  if (isFailure2(issueResult)) {
    return exit3;
  }
  const issue = new Pointer([key], issueResult.success);
  if (s.options.errors === "all") {
    if (s.issues)
      s.issues.push(issue);
    else
      s.issues = [issue];
  } else {
    return fail4(new Composite(ast, s.oinput, [issue]));
  }
};
var FINITE_PATTERN = "[+-]?\\d*\\.?\\d+(?:[Ee][+-]?\\d+)?";
var isNumberStringRegExp = /* @__PURE__ */ new globalThis.RegExp(`(?:${FINITE_PATTERN}|Infinity|-Infinity|NaN)`);
function getIndexSignatureKeys(input, parameter) {
  const encoded = toEncoded(parameter);
  switch (encoded._tag) {
    case "String":
      return Object.keys(input);
    case "TemplateLiteral": {
      const regExp = getTemplateLiteralRegExp(encoded);
      return Object.keys(input).filter((k) => regExp.test(k));
    }
    case "Symbol":
      return Object.getOwnPropertySymbols(input);
    case "Number":
      return Object.keys(input).filter((k) => isNumberStringRegExp.test(k));
    case "Union":
      return [...new Set(encoded.types.flatMap((t) => getIndexSignatureKeys(input, t)))];
    default:
      return [];
  }
}

class PropertySignature {
  name;
  type;
  constructor(name, type) {
    this.name = name;
    this.type = type;
  }
}
class IndexSignature {
  parameter;
  type;
  merge;
  constructor(parameter, type, merge3) {
    this.parameter = parameter;
    this.type = type;
    this.merge = merge3;
    if (isOptional(type) && !containsUndefined(type)) {
      throw new Error("Cannot use `Schema.optionalKey` with index signatures, use `Schema.optional` instead.");
    }
  }
}

class Objects extends Base2 {
  _tag = "Objects";
  propertySignatures;
  indexSignatures;
  constructor(propertySignatures, indexSignatures, annotations, checks, encoding, context3) {
    super(annotations, checks, encoding, context3);
    this.propertySignatures = propertySignatures;
    this.indexSignatures = indexSignatures;
    const duplicates = propertySignatures.map((ps) => ps.name).filter((name, i, arr) => arr.indexOf(name) !== i);
    if (duplicates.length > 0) {
      throw new Error(`Duplicate identifiers: ${JSON.stringify(duplicates)}. ts(2300)`);
    }
  }
  getParser(recur) {
    const ast = this;
    const expectedKeys = [];
    const expectedKeysSet = new Set;
    const properties = [];
    for (const ps of ast.propertySignatures) {
      expectedKeys.push(ps.name);
      expectedKeysSet.add(ps.name);
      properties.push({
        ps,
        parser: recur(ps.type),
        name: ps.name,
        type: ps.type
      });
    }
    const indexCount = ast.indexSignatures.length;
    if (ast.propertySignatures.length === 0 && ast.indexSignatures.length === 0) {
      return fromRefinement(ast, isNotNullish);
    }
    const parseIndexes = indexCount > 0 ? iterateEager()({
      onItem: fnUntracedEager2(function* (s, [key, is]) {
        const parserKey = recur(indexSignatureParameterFromString(is.parameter));
        const effKey = parserKey(some2(key), s.options);
        const exitKey = effectIsExit(effKey) ? effKey : yield* exit2(effKey);
        if (exitKey._tag === "Failure") {
          const eff = wrapPropertyKeyIssue(s, ast, key, exitKey);
          if (eff)
            yield* eff;
          return;
        }
        const value2 = some2(s.input[key]);
        const parserValue = recur(is.type);
        const effValue = parserValue(value2, s.options);
        const exitValue = effectIsExit(effValue) ? effValue : yield* exit2(effValue);
        if (exitValue._tag === "Failure") {
          const eff = wrapPropertyKeyIssue(s, ast, key, exitValue);
          if (eff)
            yield* eff;
          return;
        } else if (exitKey.value._tag === "Some" && exitValue.value._tag === "Some") {
          const k2 = exitKey.value.value;
          const v2 = exitValue.value.value;
          if (is.merge && is.merge.decode && Object.hasOwn(s.out, k2)) {
            const [k, v] = is.merge.decode.combine([k2, s.out[k2]], [k2, v2]);
            set(s.out, k, v);
          } else {
            set(s.out, k2, v2);
          }
        }
      }),
      step: (_s, _, exit3) => exit3._tag === "Failure" ? exit3 : undefined
    }) : undefined;
    return fnUntracedEager2(function* (oinput, options) {
      if (oinput._tag === "None") {
        return oinput;
      }
      const input = oinput.value;
      if (!(typeof input === "object" && input !== null && !Array.isArray(input))) {
        return yield* fail5(new InvalidType(ast, oinput));
      }
      const out = {};
      const state = {
        ast,
        oinput,
        input,
        out,
        issues: undefined,
        options
      };
      const errorsAllOption = options.errors === "all";
      const onExcessPropertyError = options.onExcessProperty === "error";
      const onExcessPropertyPreserve = options.onExcessProperty === "preserve";
      let inputKeys;
      if (ast.indexSignatures.length === 0 && (onExcessPropertyError || onExcessPropertyPreserve)) {
        inputKeys = Reflect.ownKeys(input);
        for (let i = 0;i < inputKeys.length; i++) {
          const key = inputKeys[i];
          if (!expectedKeysSet.has(key)) {
            if (onExcessPropertyError) {
              const issue = new Pointer([key], new UnexpectedKey(ast, input[key]));
              if (errorsAllOption) {
                if (state.issues) {
                  state.issues.push(issue);
                } else {
                  state.issues = [issue];
                }
                continue;
              } else {
                return yield* fail5(new Composite(ast, oinput, [issue]));
              }
            } else {
              set(out, key, input[key]);
            }
          }
        }
      }
      const concurrency = resolveConcurrency(options?.concurrency);
      const eff = parseProperties(state, properties, concurrency);
      if (eff)
        yield* eff;
      if (parseIndexes) {
        const keyPairs = empty2();
        for (let i = 0;i < indexCount; i++) {
          const is = ast.indexSignatures[i];
          const keys2 = getIndexSignatureKeys(input, is.parameter);
          for (let j = 0;j < keys2.length; j++) {
            const key = keys2[j];
            keyPairs.push([key, is]);
          }
        }
        const eff2 = parseIndexes(state, keyPairs, concurrency);
        if (eff2)
          yield* eff2;
      }
      if (state.issues) {
        return yield* fail5(new Composite(ast, oinput, state.issues));
      }
      if (options.propertyOrder === "original") {
        const keys2 = (inputKeys ?? Reflect.ownKeys(input)).concat(expectedKeys);
        const preserved = {};
        for (const key of keys2) {
          if (Object.hasOwn(out, key)) {
            set(preserved, key, out[key]);
          }
        }
        return some2(preserved);
      }
      return some2(out);
    });
  }
  rebuild(recur, flipMerge) {
    const props = mapOrSame(this.propertySignatures, (ps) => {
      const t = recur(ps.type);
      return t === ps.type ? ps : new PropertySignature(ps.name, t);
    });
    const indexes = mapOrSame(this.indexSignatures, (is) => {
      const p = recur(is.parameter);
      const t = recur(is.type);
      const merge3 = flipMerge ? is.merge?.flip() : is.merge;
      return p === is.parameter && t === is.type && merge3 === is.merge ? is : new IndexSignature(p, t, merge3);
    });
    return props === this.propertySignatures && indexes === this.indexSignatures ? this : new Objects(props, indexes, this.annotations, this.checks, undefined, this.context);
  }
  flip(recur) {
    return this.rebuild(recur, true);
  }
  recur(recur) {
    return this.rebuild(recur, false);
  }
  getExpected() {
    if (this.propertySignatures.length === 0 && this.indexSignatures.length === 0)
      return "object | array";
    return "object";
  }
}
var parseProperties = /* @__PURE__ */ iterateEager()({
  onItem(s, p) {
    const value2 = Object.hasOwn(s.input, p.name) ? some2(s.input[p.name]) : none2();
    return p.parser(value2, s.options);
  },
  step(s, p, exit3) {
    if (exit3._tag === "Failure") {
      return wrapPropertyKeyIssue(s, s.ast, p.name, exit3);
    } else if (exit3.value._tag === "Some") {
      set(s.out, p.name, exit3.value.value);
    } else if (!isOptional(p.type)) {
      const issue = new Pointer([p.name], new MissingKey(p.type.context?.annotations));
      if (s.options.errors === "all") {
        if (s.issues)
          s.issues.push(issue);
        else
          s.issues = [issue];
        return;
      } else {
        return fail4(new Composite(s.ast, s.oinput, [issue]));
      }
    }
  }
});
function struct(fields, checks, annotations) {
  return new Objects(Reflect.ownKeys(fields).map((key) => {
    return new PropertySignature(key, fields[key].ast);
  }), [], annotations, checks);
}
function getAST(self) {
  return self.ast;
}
function tuple(elements, checks = undefined) {
  return new Arrays(false, elements.map((e) => e.ast), [], undefined, checks);
}
function union2(members, mode, checks) {
  return new Union(members.map(getAST), mode, undefined, checks);
}
function getCandidateTypes(ast) {
  switch (ast._tag) {
    case "Null":
      return ["null"];
    case "Undefined":
    case "Void":
      return ["undefined"];
    case "String":
    case "TemplateLiteral":
      return ["string"];
    case "Number":
      return ["number"];
    case "Boolean":
      return ["boolean"];
    case "Symbol":
    case "UniqueSymbol":
      return ["symbol"];
    case "BigInt":
      return ["bigint"];
    case "Arrays":
      return ["array"];
    case "ObjectKeyword":
      return ["object", "array", "function"];
    case "Objects":
      return ast.propertySignatures.length || ast.indexSignatures.length ? ["object"] : ["object", "array"];
    case "Enum":
      return Array.from(new Set(ast.enums.map(([, v]) => typeof v)));
    case "Literal":
      return [typeof ast.literal];
    case "Union":
      return Array.from(new Set(ast.types.flatMap(getCandidateTypes)));
    default:
      return ["null", "undefined", "string", "number", "boolean", "symbol", "bigint", "object", "array", "function"];
  }
}
function collectSentinels(ast) {
  switch (ast._tag) {
    default:
      return [];
    case "Declaration": {
      const s = ast.annotations?.["~sentinels"];
      return Array.isArray(s) ? s : [];
    }
    case "Objects":
      return ast.propertySignatures.flatMap((ps) => {
        const type = ps.type;
        if (!isOptional(type)) {
          if (isLiteral(type)) {
            return [{
              key: ps.name,
              literal: type.literal
            }];
          }
          if (isUniqueSymbol(type)) {
            return [{
              key: ps.name,
              literal: type.symbol
            }];
          }
        }
        return [];
      });
    case "Arrays":
      return ast.elements.flatMap((e, i) => {
        return isLiteral(e) && !isOptional(e) ? [{
          key: i,
          literal: e.literal
        }] : [];
      });
    case "Suspend":
      return collectSentinels(ast.thunk());
  }
}
var candidateIndexCache = /* @__PURE__ */ new WeakMap;
function getIndex(types) {
  let idx = candidateIndexCache.get(types);
  if (idx)
    return idx;
  idx = {};
  for (const a of types) {
    const encoded = toEncoded(a);
    if (isNever2(encoded))
      continue;
    const types2 = getCandidateTypes(encoded);
    const sentinels = collectSentinels(encoded);
    idx.byType ??= {};
    for (const t of types2)
      (idx.byType[t] ??= []).push(a);
    if (sentinels.length > 0) {
      idx.bySentinel ??= new Map;
      for (const {
        key,
        literal
      } of sentinels) {
        let m = idx.bySentinel.get(key);
        if (!m)
          idx.bySentinel.set(key, m = new Map);
        let arr = m.get(literal);
        if (!arr)
          m.set(literal, arr = []);
        arr.push(a);
      }
    } else {
      idx.otherwise ??= {};
      for (const t of types2)
        (idx.otherwise[t] ??= []).push(a);
    }
  }
  candidateIndexCache.set(types, idx);
  return idx;
}
function filterLiterals(input) {
  return (ast) => {
    const encoded = toEncoded(ast);
    return encoded._tag === "Literal" ? encoded.literal === input : encoded._tag === "UniqueSymbol" ? encoded.symbol === input : true;
  };
}
function getCandidates(input, types) {
  const idx = getIndex(types);
  const runtimeType = input === null ? "null" : Array.isArray(input) ? "array" : typeof input;
  if (idx.bySentinel) {
    const base = idx.otherwise?.[runtimeType] ?? [];
    if (runtimeType === "object" || runtimeType === "array") {
      for (const [k, m] of idx.bySentinel) {
        if (Object.hasOwn(input, k)) {
          const match6 = m.get(input[k]);
          if (match6)
            return [...match6, ...base].filter(filterLiterals(input));
        }
      }
    }
    return base;
  }
  return (idx.byType?.[runtimeType] ?? []).filter(filterLiterals(input));
}

class Union extends Base2 {
  _tag = "Union";
  types;
  mode;
  constructor(types, mode, annotations, checks, encoding, context3) {
    super(annotations, checks, encoding, context3);
    this.types = types;
    this.mode = mode;
  }
  getParser(recur) {
    const ast = this;
    return (oinput, options) => {
      if (oinput._tag === "None") {
        return succeed5(oinput);
      }
      const input = oinput.value;
      const candidates = getCandidates(input, ast.types);
      const state = {
        ast,
        recur,
        oinput,
        input,
        out: undefined,
        successes: [],
        issues: undefined,
        options
      };
      const concurrency = resolveConcurrency(options?.concurrency);
      const eff = parseUnion(state, candidates, concurrency);
      if (!eff) {
        return state.out ? succeed5(state.out) : fail5(new AnyOf(ast, input, state.issues ?? []));
      }
      return flatMap2(eff, (_) => {
        return state.out ? succeed5(state.out) : fail5(new AnyOf(ast, input, state.issues ?? []));
      });
    };
  }
  recur(recur) {
    const types = mapOrSame(this.types, recur);
    return types === this.types ? this : new Union(types, this.mode, this.annotations, this.checks, undefined, this.context);
  }
  getExpected(getExpected2) {
    const expected = this.annotations?.expected;
    if (typeof expected === "string")
      return expected;
    if (this.types.length === 0)
      return "never";
    const types = this.types.map((type) => {
      const encoded = toEncoded(type);
      switch (encoded._tag) {
        case "Arrays": {
          const literals = encoded.elements.filter(isLiteral);
          if (literals.length > 0) {
            return `${formatIsMutable(encoded.isMutable)}[ ${literals.map((e) => getExpected2(e) + formatIsOptional(e.context?.isOptional)).join(", ")}, ... ]`;
          }
          break;
        }
        case "Objects": {
          const literals = encoded.propertySignatures.filter((ps) => isLiteral(ps.type));
          if (literals.length > 0) {
            return `{ ${literals.map((ps) => `${formatIsMutable(ps.type.context?.isMutable)}${formatPropertyKey(ps.name)}${formatIsOptional(ps.type.context?.isOptional)}: ${getExpected2(ps.type)}`).join(", ")}, ... }`;
          }
          break;
        }
      }
      return getExpected2(encoded);
    });
    return Array.from(new Set(types)).join(" | ");
  }
}
var parseUnion = /* @__PURE__ */ iterateEager()({
  onItem(s, ast) {
    const parser = s.recur(ast);
    return parser(s.oinput, s.options);
  },
  step(s, candidate, exit3) {
    if (exit3._tag === "Failure") {
      const issueResult = findError2(exit3.cause);
      if (isFailure2(issueResult)) {
        return exit3;
      }
      if (s.issues)
        s.issues.push(issueResult.success);
      else
        s.issues = [issueResult.success];
    } else {
      if (s.out && s.ast.mode === "oneOf") {
        s.successes.push(candidate);
        return fail4(new OneOf(s.ast, s.input, s.successes));
      }
      s.out = exit3.value;
      s.successes.push(candidate);
      if (s.ast.mode === "anyOf") {
        return void_2;
      }
    }
  }
});
var nonFiniteLiterals = /* @__PURE__ */ new Union([/* @__PURE__ */ new Literal("Infinity"), /* @__PURE__ */ new Literal("-Infinity"), /* @__PURE__ */ new Literal("NaN")], "anyOf");
var numberToJson = /* @__PURE__ */ new Link(/* @__PURE__ */ new Union([number2, nonFiniteLiterals], "anyOf"), /* @__PURE__ */ new Transformation(/* @__PURE__ */ Number4(), /* @__PURE__ */ transform((n) => globalThis.Number.isFinite(n) ? n : globalThis.String(n))));
function formatIsMutable(isMutable) {
  return isMutable ? "" : "readonly ";
}
function formatIsOptional(isOptional) {
  return isOptional ? "?" : "";
}
class Filter3 extends Class {
  _tag = "Filter";
  run;
  annotations;
  aborted;
  constructor(run, annotations = undefined, aborted = false) {
    super();
    this.run = run;
    this.annotations = annotations;
    this.aborted = aborted;
  }
  annotate(annotations) {
    return new Filter3(this.run, {
      ...this.annotations,
      ...annotations
    }, this.aborted);
  }
  abort() {
    return new Filter3(this.run, this.annotations, true);
  }
  and(other, annotations) {
    return new FilterGroup([this, other], annotations);
  }
}

class FilterGroup extends Class {
  _tag = "FilterGroup";
  checks;
  annotations;
  constructor(checks, annotations = undefined) {
    super();
    this.checks = checks;
    this.annotations = annotations;
  }
  annotate(annotations) {
    return new FilterGroup(this.checks, {
      ...this.annotations,
      ...annotations
    });
  }
  and(other, annotations) {
    return new FilterGroup([this, other], annotations);
  }
}
function makeFilter(filter7, annotations, aborted = false) {
  return new Filter3((input, ast, options) => make9(input, ast, filter7(input, ast, options)), annotations, aborted);
}
function isPattern(regExp, annotations) {
  const source = regExp.source;
  return makeFilter((s) => regExp.test(s), {
    expected: `a string matching the RegExp ${source}`,
    meta: {
      _tag: "isPattern",
      regExp
    },
    toArbitraryConstraint: {
      string: {
        patterns: [regExp.source]
      }
    },
    ...annotations
  });
}
function modifyOwnPropertyDescriptors(ast, f) {
  const d = Object.getOwnPropertyDescriptors(ast);
  f(d);
  return Object.create(Object.getPrototypeOf(ast), d);
}
function replaceEncoding(ast, encoding) {
  if (ast.encoding === encoding) {
    return ast;
  }
  return modifyOwnPropertyDescriptors(ast, (d) => {
    d.encoding.value = encoding;
  });
}
function replaceContext(ast, context3) {
  if (ast.context === context3) {
    return ast;
  }
  return modifyOwnPropertyDescriptors(ast, (d) => {
    d.context.value = context3;
  });
}
function annotate(ast, annotations) {
  if (ast.checks) {
    const last = ast.checks[ast.checks.length - 1];
    return replaceChecks(ast, append(ast.checks.slice(0, -1), last.annotate(annotations)));
  }
  return modifyOwnPropertyDescriptors(ast, (d) => {
    d.annotations.value = {
      ...d.annotations.value,
      ...annotations
    };
  });
}
function replaceChecks(ast, checks) {
  if (ast.checks === checks) {
    return ast;
  }
  return modifyOwnPropertyDescriptors(ast, (d) => {
    d.checks.value = checks;
  });
}
function appendChecks(ast, checks) {
  return replaceChecks(ast, ast.checks ? [...ast.checks, ...checks] : checks);
}
function updateLastLink(encoding, f) {
  const links = encoding;
  const last = links[links.length - 1];
  const to = f(last.to);
  if (to !== last.to) {
    return append(encoding.slice(0, encoding.length - 1), new Link(to, last.transformation));
  }
  return encoding;
}
function applyToLastLink(f) {
  return (ast) => ast.encoding ? replaceEncoding(ast, updateLastLink(ast.encoding, f)) : ast;
}
function appendTransformation(from, transformation, to) {
  const link = new Link(from, transformation);
  return replaceEncoding(to, to.encoding ? [...to.encoding, link] : [link]);
}
function mapOrSame(as3, f) {
  let changed = false;
  const out = new Array(as3.length);
  for (let i = 0;i < as3.length; i++) {
    const a = as3[i];
    const fa = f(a);
    if (fa !== a) {
      changed = true;
    }
    out[i] = fa;
  }
  return changed ? out : as3;
}
function annotateKey(ast, annotations) {
  const context3 = ast.context ? new Context2(ast.context.isOptional, ast.context.isMutable, ast.context.defaultValue, {
    ...ast.context.annotations,
    ...annotations
  }) : new Context2(false, false, undefined, annotations);
  return replaceContext(ast, context3);
}
var optionalKeyLastLink = /* @__PURE__ */ applyToLastLink(optionalKey);
function optionalKey(ast) {
  const context3 = ast.context ? ast.context.isOptional === false ? new Context2(true, ast.context.isMutable, ast.context.defaultValue, ast.context.annotations) : ast.context : new Context2(true, false);
  return optionalKeyLastLink(replaceContext(ast, context3));
}
function withConstructorDefault(ast, defaultValue) {
  const transformation = new Transformation(withDefault(defaultValue), passthrough2());
  const encoding = [new Link(unknown, transformation)];
  const context3 = ast.context ? new Context2(ast.context.isOptional, ast.context.isMutable, encoding, ast.context.annotations) : new Context2(false, false, encoding);
  return replaceContext(ast, context3);
}
function decodeTo(from, to, transformation) {
  return appendTransformation(from, transformation, to);
}
function isOptional(ast) {
  return ast.context?.isOptional ?? false;
}
var toType = /* @__PURE__ */ memoize((ast) => {
  if (ast.encoding) {
    return toType(replaceEncoding(ast, undefined));
  }
  const out = ast;
  return out.recur?.(toType) ?? out;
});
var toEncoded = /* @__PURE__ */ memoize((ast) => {
  return toType(flip3(ast));
});
function flipEncoding(ast, encoding) {
  const links = encoding;
  const len = links.length;
  const last = links[len - 1];
  const ls = [new Link(flip3(replaceEncoding(ast, undefined)), links[0].transformation.flip())];
  for (let i = 1;i < len; i++) {
    ls.unshift(new Link(flip3(links[i - 1].to), links[i].transformation.flip()));
  }
  const to = flip3(last.to);
  if (to.encoding) {
    return replaceEncoding(to, [...to.encoding, ...ls]);
  } else {
    return replaceEncoding(to, ls);
  }
}
var flip3 = /* @__PURE__ */ memoize((ast) => {
  if (ast.encoding) {
    return flipEncoding(ast, ast.encoding);
  }
  const out = ast;
  return out.flip?.(flip3) ?? out.recur?.(flip3) ?? out;
});
function containsUndefined(ast) {
  switch (ast._tag) {
    case "Undefined":
      return true;
    case "Union":
      return ast.types.some(containsUndefined);
    default:
      return false;
  }
}
function getTemplateLiteralSource(ast, top) {
  return ast.encodedParts.map((part) => handleTemplateLiteralASTPartParens(part, getTemplateLiteralASTPartPattern(part), top)).join("");
}
var getTemplateLiteralRegExp = /* @__PURE__ */ memoize((ast) => {
  return new globalThis.RegExp(`^${getTemplateLiteralSource(ast, true)}$`);
});
function getTemplateLiteralASTPartPattern(part) {
  switch (part._tag) {
    case "Literal":
      return escape(globalThis.String(part.literal));
    case "String":
      return STRING_PATTERN;
    case "Number":
      return FINITE_PATTERN;
    case "BigInt":
      return BIGINT_PATTERN;
    case "TemplateLiteral":
      return getTemplateLiteralSource(part, false);
    case "Union":
      return part.types.map(getTemplateLiteralASTPartPattern).join("|");
  }
}
function handleTemplateLiteralASTPartParens(part, s, top) {
  if (isUnion(part)) {
    if (!top) {
      return `(?:${s})`;
    }
  } else if (!top) {
    return s;
  }
  return `(${s})`;
}
function fromConst(ast, value2) {
  const succeed7 = succeedSome2(value2);
  return (oinput) => {
    if (oinput._tag === "None") {
      return succeedNone2;
    }
    return oinput.value === value2 ? succeed7 : fail5(new InvalidType(ast, oinput));
  };
}
function fromRefinement(ast, refinement) {
  return (oinput) => {
    if (oinput._tag === "None") {
      return succeedNone2;
    }
    return refinement(oinput.value) ? succeed5(oinput) : fail5(new InvalidType(ast, oinput));
  };
}
function toCodec(f) {
  function out(ast) {
    return ast.encoding ? replaceEncoding(ast, updateLastLink(ast.encoding, out)) : f(ast);
  }
  return memoize(out);
}
var indexSignatureParameterFromString = /* @__PURE__ */ toCodec((ast) => {
  switch (ast._tag) {
    default:
      return ast;
    case "Number":
      return ast.toCodecStringTree();
    case "Union":
      return ast.recur(indexSignatureParameterFromString);
  }
});
var STRING_PATTERN = "[\\s\\S]*?";
var isStringFiniteRegExp = /* @__PURE__ */ new globalThis.RegExp(`^${FINITE_PATTERN}$`);
function isStringFinite(annotations) {
  return isPattern(isStringFiniteRegExp, {
    expected: "a string representing a finite number",
    meta: {
      _tag: "isStringFinite",
      regExp: isStringFiniteRegExp
    },
    ...annotations
  });
}
var finiteString = /* @__PURE__ */ appendChecks(string2, [/* @__PURE__ */ isStringFinite()]);
var finiteToString = /* @__PURE__ */ new Link(finiteString, numberFromString);
var numberToString = /* @__PURE__ */ new Link(/* @__PURE__ */ new Union([finiteString, nonFiniteLiterals], "anyOf"), numberFromString);
var BIGINT_PATTERN = "-?\\d+";
var isStringBigIntRegExp = /* @__PURE__ */ new globalThis.RegExp(`^${BIGINT_PATTERN}$`);
var REGEXP_PATTERN = "Symbol\\((.*)\\)";
var isStringSymbolRegExp = /* @__PURE__ */ new globalThis.RegExp(`^${REGEXP_PATTERN}$`);
function collectIssues(checks, value2, issues, ast, options) {
  for (let i = 0;i < checks.length; i++) {
    const check = checks[i];
    if (check._tag === "FilterGroup") {
      collectIssues(check.checks, value2, issues, ast, options);
    } else {
      const issue = check.run(value2, ast, options);
      if (issue) {
        issues.push(new Filter2(value2, check, issue));
        if (check.aborted || options?.errors !== "all") {
          return;
        }
      }
    }
  }
}
var ClassTypeId = "~effect/Schema/Class";
var STRUCTURAL_ANNOTATION_KEY = "~structural";
function isJson(u) {
  const onPath = new Set;
  const validated = new Set;
  return recur(u);
  function recur(u2) {
    if (u2 === null || typeof u2 === "string" || typeof u2 === "boolean") {
      return true;
    }
    if (typeof u2 === "number") {
      return globalThis.Number.isFinite(u2);
    }
    if (typeof u2 !== "object" || u2 === undefined) {
      return false;
    }
    if (onPath.has(u2)) {
      return false;
    }
    if (validated.has(u2)) {
      return true;
    }
    onPath.add(u2);
    const ok = Array.isArray(u2) ? u2.every(recur) : Object.keys(u2).every((key) => recur(u2[key]));
    onPath.delete(u2);
    if (ok) {
      validated.add(u2);
    }
    return ok;
  }
}
var Json = /* @__PURE__ */ new Declaration([], () => (input, ast) => isJson(input) ? succeed5(input) : fail5(new InvalidType(ast, some2(input))), {
  typeConstructor: {
    _tag: "effect/Json"
  },
  generation: {
    runtime: `Schema.Json`,
    Type: `Schema.Json`
  },
  expected: "JSON value",
  toCodecJson: () => new Link(unknown, passthrough3())
});
var unknownToNull = /* @__PURE__ */ new Link(null_, /* @__PURE__ */ new Transformation(/* @__PURE__ */ passthrough2(), /* @__PURE__ */ transform(() => null)));
var unknownToJson = /* @__PURE__ */ new Link(Json, /* @__PURE__ */ passthrough3());

// node_modules/effect/dist/Struct.js
var lambda = (f) => f;

// node_modules/effect/dist/SchemaParser.js
var recurDefaults = /* @__PURE__ */ memoize((ast) => {
  switch (ast._tag) {
    case "Declaration": {
      const getLink = ast.annotations?.[ClassTypeId];
      if (isFunction(getLink)) {
        const link = getLink(ast.typeParameters);
        const to = recurDefaults(link.to);
        return replaceEncoding(ast, to === link.to ? [link] : [new Link(to, link.transformation)]);
      }
      return ast;
    }
    case "Objects":
    case "Arrays":
      return ast.recur((ast2) => {
        const defaultValue = ast2.context?.defaultValue;
        if (defaultValue) {
          return replaceEncoding(recurDefaults(ast2), defaultValue);
        }
        return recurDefaults(ast2);
      });
    case "Suspend":
      return ast.recur(recurDefaults);
    default:
      return ast;
  }
});
function makeEffect(schema) {
  const ast = recurDefaults(toType(schema.ast));
  const parser = run(ast);
  return (input, options) => {
    return parser(input, options?.disableChecks ? options?.parseOptions ? {
      ...options.parseOptions,
      disableChecks: true
    } : {
      disableChecks: true
    } : options?.parseOptions);
  };
}
function makeOption(schema) {
  const parser = makeEffect(schema);
  return (input, options) => {
    return getSuccess2(runSyncExit2(parser(input, options)));
  };
}
function make11(schema) {
  const parser = makeEffect(schema);
  return (input, options) => {
    return runSync2(mapErrorEager2(parser(input, options), (issue) => new Error(issue.toString(), {
      cause: issue
    })));
  };
}
function encodeUnknownEffect(schema, options) {
  const parser = run(flip3(schema.ast));
  return options === undefined ? parser : (input, overrideOptions) => parser(input, mergeParseOptions(options, overrideOptions));
}
var mergeParseOptions = (options, overrideOptions) => overrideOptions === undefined ? options : {
  ...options,
  ...overrideOptions
};
function run(ast) {
  const parser = recur(ast);
  return (input, options) => flatMapEager2(parser(some2(input), options ?? defaultParseOptions), (oa) => {
    if (oa._tag === "None") {
      return fail5(new InvalidValue(oa));
    }
    return succeed5(oa.value);
  });
}
var recur = /* @__PURE__ */ memoize((ast) => {
  let parser;
  const astOptions = resolve(ast)?.["parseOptions"];
  if (!ast.context && !ast.encoding && !ast.checks) {
    return (ou, options) => {
      parser ??= ast.getParser(recur);
      if (astOptions) {
        options = {
          ...options,
          ...astOptions
        };
      }
      return parser(ou, options);
    };
  }
  const isStructural = isArrays(ast) || isObjects(ast) || isDeclaration(ast) && ast.typeParameters.length > 0;
  return (ou, options) => {
    if (astOptions) {
      options = {
        ...options,
        ...astOptions
      };
    }
    const encoding = ast.encoding;
    let srou;
    if (encoding) {
      const links = encoding;
      const len = links.length;
      for (let i = len - 1;i >= 0; i--) {
        const link = links[i];
        const to = link.to;
        const parser2 = recur(to);
        srou = srou ? flatMapEager2(srou, (ou2) => parser2(ou2, options)) : parser2(ou, options);
        if (link.transformation._tag === "Transformation") {
          const getter = link.transformation.decode;
          srou = flatMapEager2(srou, (ou2) => getter.run(ou2, options));
        } else {
          srou = link.transformation.decode(srou, options);
        }
      }
      srou = mapErrorEager2(srou, (issue) => new Encoding2(ast, ou, issue));
    }
    parser ??= ast.getParser(recur);
    let sroa = srou ? flatMapEager2(srou, (ou2) => parser(ou2, options)) : parser(ou, options);
    if (ast.checks && !options?.disableChecks) {
      const checks = ast.checks;
      if (options?.errors === "all" && isStructural && isSome2(ou)) {
        sroa = catchEager2(sroa, (issue) => {
          const issues = [];
          collectIssues(checks.filter((check) => check.annotations?.[STRUCTURAL_ANNOTATION_KEY]), ou.value, issues, ast, options);
          const out = isArrayNonEmpty2(issues) ? issue._tag === "Composite" && issue.ast === ast ? new Composite(ast, issue.actual, [...issue.issues, ...issues]) : new Composite(ast, ou, [issue, ...issues]) : issue;
          return fail5(out);
        });
      }
      sroa = flatMapEager2(sroa, (oa) => {
        if (isSome2(oa)) {
          const value2 = oa.value;
          const issues = [];
          collectIssues(checks, value2, issues, ast, options);
          if (isArrayNonEmpty2(issues)) {
            return fail5(new Composite(ast, oa, issues));
          }
        }
        return succeed5(oa);
      });
    }
    return sroa;
  };
});

// node_modules/effect/dist/internal/schema/schema.js
var TypeId20 = "~effect/Schema/Schema";
var SchemaProto = {
  [TypeId20]: TypeId20,
  pipe() {
    return pipeArguments(this, arguments);
  },
  annotate(annotations) {
    return this.rebuild(annotate(this.ast, annotations));
  },
  annotateKey(annotations) {
    return this.rebuild(annotateKey(this.ast, annotations));
  },
  check(...checks) {
    return this.rebuild(appendChecks(this.ast, checks));
  }
};
function make12(ast, options) {
  const self = Object.create(SchemaProto);
  if (options) {
    Object.assign(self, options);
  }
  self.ast = ast;
  self.rebuild = (ast2) => make12(ast2, options);
  self.makeEffect = flow(makeEffect(self), mapErrorEager2((issue) => new SchemaError(issue)));
  self.make = make11(self);
  self.makeOption = makeOption(self);
  return self;
}
var SchemaErrorTypeId = "~effect/Schema/SchemaError";

class SchemaError {
  [SchemaErrorTypeId] = SchemaErrorTypeId;
  _tag = "SchemaError";
  name = "SchemaError";
  issue;
  constructor(issue) {
    this.issue = issue;
  }
  get message() {
    return this.issue.toString();
  }
  toString() {
    return `SchemaError(${this.message})`;
  }
}
var jsonReorder = /* @__PURE__ */ makeReorder(getJsonPriority);
function getJsonPriority(ast) {
  switch (ast._tag) {
    case "BigInt":
    case "Symbol":
    case "UniqueSymbol":
      return 0;
    default:
      return 1;
  }
}
function makeReorder(getPriority) {
  return (types) => {
    const indexMap = new Map;
    for (let i = 0;i < types.length; i++) {
      indexMap.set(toEncoded(types[i]), i);
    }
    const sortedTypes = [...types].sort((a, b) => {
      a = toEncoded(a);
      b = toEncoded(b);
      const pa = getPriority(a);
      const pb = getPriority(b);
      if (pa !== pb)
        return pa - pb;
      return indexMap.get(a) - indexMap.get(b);
    });
    const orderChanged = sortedTypes.some((ast, index) => ast !== types[index]);
    if (!orderChanged)
      return types;
    return sortedTypes;
  };
}

// node_modules/effect/dist/Schema.js
function declareConstructor() {
  return (typeParameters, run2, annotations) => {
    return make13(new Declaration(typeParameters.map(getAST), (typeParameters2) => run2(typeParameters2.map((ast) => make13(ast))), annotations));
  };
}
function declare(is, annotations) {
  return declareConstructor()([], () => (input, ast) => is(input) ? succeed5(input) : fail5(new InvalidType(ast, some2(input))), annotations);
}
var make13 = make12;
var optionalKey2 = /* @__PURE__ */ lambda((schema) => make13(optionalKey(schema.ast), {
  schema
}));
function Literal2(literal) {
  const out = make13(new Literal(literal), {
    literal,
    transform(to) {
      return out.pipe(decodeTo2(Literal2(to), {
        decode: transform(() => to),
        encode: transform(() => literal)
      }));
    }
  });
  return out;
}
var String5 = /* @__PURE__ */ make13(string2);
var Number6 = /* @__PURE__ */ make13(number2);
function makeStruct(ast, fields) {
  return make13(ast, {
    fields,
    mapFields(f, options) {
      const fields2 = f(this.fields);
      return makeStruct(struct(fields2, options?.unsafePreserveChecks ? this.ast.checks : undefined), fields2);
    }
  });
}
function Struct2(fields) {
  return makeStruct(struct(fields, undefined), fields);
}
function makeTuple(ast, elements) {
  return make13(ast, {
    elements,
    mapElements(f, options) {
      const elements2 = f(this.elements);
      return makeTuple(tuple(elements2, options?.unsafePreserveChecks ? this.ast.checks : undefined), elements2);
    }
  });
}
function Tuple3(elements) {
  return makeTuple(tuple(elements), elements);
}
var ArraySchema = /* @__PURE__ */ lambda((schema) => make13(new Arrays(false, [], [schema.ast]), {
  value: schema
}));
function makeUnion(ast, members) {
  return make13(ast, {
    members,
    mapMembers(f, options) {
      const members2 = f(this.members);
      return makeUnion(union2(members2, this.ast.mode, options?.unsafePreserveChecks ? this.ast.checks : undefined), members2);
    }
  });
}
function Union2(members, options) {
  return makeUnion(union2(members, options?.mode ?? "anyOf", undefined), members);
}
function decodeTo2(to, transformation) {
  return (from) => {
    return make13(decodeTo(from.ast, to.ast, transformation ? make10(transformation) : passthrough3()), {
      from,
      to
    });
  };
}
function withConstructorDefault2(defaultValue) {
  return (schema) => make13(withConstructorDefault(schema.ast, mapErrorEager2(defaultValue, (e) => e.issue)), {
    schema
  });
}
function tag(literal) {
  return Literal2(literal).pipe(withConstructorDefault2(succeed5(literal)));
}
function instanceOf(constructor, annotations) {
  return declare((u) => u instanceof constructor, annotations);
}
function link() {
  return (encodeTo, transformation) => {
    return new Link(encodeTo.ast, make10(transformation));
  };
}
var isPattern2 = isPattern;
function isBase64(annotations) {
  const regExp = /^([0-9a-zA-Z+/]{4})*(([0-9a-zA-Z+/]{2}==)|([0-9a-zA-Z+/]{3}=))?$/;
  return isPattern2(regExp, {
    expected: "a base64 encoded string",
    meta: {
      _tag: "isBase64",
      regExp
    },
    ...annotations
  });
}
var ErrorJsonEncoded = /* @__PURE__ */ Struct2({
  message: String5,
  name: /* @__PURE__ */ optionalKey2(String5),
  stack: /* @__PURE__ */ optionalKey2(String5)
});
var Error4 = /* @__PURE__ */ instanceOf(globalThis.Error, {
  typeConstructor: {
    _tag: "Error"
  },
  generation: {
    runtime: `Schema.Error`,
    Type: `globalThis.Error`
  },
  expected: "Error",
  toCodecJson: () => link()(ErrorJsonEncoded, errorFromErrorJsonEncoded()),
  toArbitrary: () => (fc) => fc.string().map((message) => new globalThis.Error(message))
});
var ErrorWithStack = /* @__PURE__ */ instanceOf(globalThis.Error, {
  typeConstructor: {
    _tag: "ErrorWithStack"
  },
  generation: {
    runtime: `Schema.ErrorWithStack`,
    Type: `globalThis.Error`
  },
  expected: "Error",
  toCodecJson: () => link()(ErrorJsonEncoded, errorFromErrorJsonEncoded({
    includeStack: true
  })),
  toArbitrary: () => (fc) => fc.string().map((message) => new globalThis.Error(message))
});
var RegExp4 = /* @__PURE__ */ instanceOf(globalThis.RegExp, {
  typeConstructor: {
    _tag: "RegExp"
  },
  generation: {
    runtime: `Schema.RegExp`,
    Type: `globalThis.RegExp`
  },
  expected: "RegExp",
  toCodecJson: () => link()(Struct2({
    source: String5,
    flags: String5
  }), transformOrFail2({
    decode: (e) => try_3({
      try: () => new globalThis.RegExp(e.source, e.flags),
      catch: (e2) => new InvalidValue(some2(e2), {
        message: globalThis.String(e2)
      })
    }),
    encode: (regExp) => succeed5({
      source: regExp.source,
      flags: regExp.flags
    })
  })),
  toArbitrary: () => (fc) => fc.tuple(fc.constantFrom(".", ".*", "\\d+", "\\w+", "[a-z]+", "[A-Z]+", "[0-9]+", "^[a-zA-Z0-9]+$", "^\\d{4}-\\d{2}-\\d{2}$"), fc.uniqueArray(fc.constantFrom("g", "i", "m", "s", "u", "y"), {
    minLength: 0,
    maxLength: 6
  }).map((flags) => flags.join(""))).map(([source, flags]) => new globalThis.RegExp(source, flags)),
  toEquivalence: () => (a, b) => a.source === b.source && a.flags === b.flags
});
var URLString = /* @__PURE__ */ String5.annotate({
  expected: "a string that will be decoded as a URL"
});
var URL2 = /* @__PURE__ */ instanceOf(globalThis.URL, {
  typeConstructor: {
    _tag: "URL"
  },
  generation: {
    runtime: `Schema.URL`,
    Type: `globalThis.URL`
  },
  expected: "URL",
  toCodecJson: () => link()(URLString, urlFromString),
  toArbitrary: () => (fc) => fc.webUrl().map((s) => new globalThis.URL(s)),
  toEquivalence: () => (a, b) => a.toString() === b.toString()
});
var DateString = /* @__PURE__ */ String5.annotate({
  expected: "a string in ISO 8601 format that will be decoded as a Date"
});
var Date3 = /* @__PURE__ */ instanceOf(globalThis.Date, {
  typeConstructor: {
    _tag: "Date"
  },
  generation: {
    runtime: `Schema.Date`,
    Type: `globalThis.Date`
  },
  expected: "Date",
  toCodecJson: () => link()(DateString, dateFromString),
  toArbitrary: () => (fc, ctx) => fc.date(ctx?.constraints?.date)
});
var File = /* @__PURE__ */ instanceOf(globalThis.File, {
  typeConstructor: {
    _tag: "File"
  },
  generation: {
    runtime: `Schema.File`,
    Type: `globalThis.File`
  },
  expected: "File",
  toCodecJson: () => link()(Struct2({
    data: String5.check(isBase64()),
    type: String5,
    name: String5,
    lastModified: Number6
  }), transformOrFail2({
    decode: (e) => match3(decodeBase64(e.data), {
      onFailure: (error) => fail5(new InvalidValue(some2(e.data), {
        message: error.message
      })),
      onSuccess: (bytes) => {
        const buffer2 = new globalThis.Uint8Array(bytes);
        return succeed5(new globalThis.File([buffer2], e.name, {
          type: e.type,
          lastModified: e.lastModified
        }));
      }
    }),
    encode: (file) => tryPromise2({
      try: async () => {
        const bytes = new globalThis.Uint8Array(await file.arrayBuffer());
        return {
          data: encodeBase64(bytes),
          type: file.type,
          name: file.name,
          lastModified: file.lastModified
        };
      },
      catch: (e) => new InvalidValue(some2(file), {
        message: globalThis.String(e)
      })
    })
  }))
});
var FormData2 = /* @__PURE__ */ instanceOf(globalThis.FormData, {
  typeConstructor: {
    _tag: "FormData"
  },
  generation: {
    runtime: `Schema.FormData`,
    Type: `globalThis.FormData`
  },
  expected: "FormData",
  toCodecJson: () => link()(ArraySchema(Tuple3([String5, Union2([Struct2({
    _tag: tag("String"),
    value: String5
  }), Struct2({
    _tag: tag("File"),
    value: File
  })])])), transformOrFail2({
    decode: (e) => {
      const out = new globalThis.FormData;
      for (const [key, entry] of e) {
        out.append(key, entry.value);
      }
      return succeed5(out);
    },
    encode: (formData) => {
      return succeed5(globalThis.Array.from(formData.entries()).map(([key, value2]) => {
        if (typeof value2 === "string") {
          return [key, {
            _tag: "String",
            value: value2
          }];
        } else {
          return [key, {
            _tag: "File",
            value: value2
          }];
        }
      }));
    }
  }))
});
var URLSearchParams2 = /* @__PURE__ */ instanceOf(globalThis.URLSearchParams, {
  typeConstructor: {
    _tag: "URLSearchParams"
  },
  generation: {
    runtime: `Schema.URLSearchParams`,
    Type: `globalThis.URLSearchParams`
  },
  expected: "URLSearchParams",
  toCodecJson: () => link()(String5.annotate({
    expected: "a query string that will be decoded as URLSearchParams"
  }), transform2({
    decode: (e) => new globalThis.URLSearchParams(e),
    encode: (params) => params.toString()
  }))
});
var Base64String = /* @__PURE__ */ String5.annotate({
  expected: "a base64 encoded string that will be decoded as Uint8Array",
  format: "byte",
  contentEncoding: "base64"
});
var Uint8Array2 = /* @__PURE__ */ instanceOf(globalThis.Uint8Array, {
  typeConstructor: {
    _tag: "Uint8Array"
  },
  generation: {
    runtime: `Schema.Uint8Array`,
    Type: `globalThis.Uint8Array`
  },
  expected: "Uint8Array",
  toCodecJson: () => link()(Base64String, uint8ArrayFromBase64String),
  toArbitrary: () => (fc) => fc.uint8Array()
});
function toCodecJson(schema) {
  return make13(toCodecJsonTop(schema.ast));
}
var toCodecJsonTop = /* @__PURE__ */ toCodec((ast) => {
  const out = toCodecJsonBase(ast, toCodecJsonTop);
  return out !== ast && isOptional(ast) ? optionalKeyLastLink(out) : out;
});
function toCodecJsonBase(ast, recur2) {
  switch (ast._tag) {
    case "Declaration": {
      const getLink = ast.annotations?.toCodecJson ?? ast.annotations?.toCodec;
      if (isFunction(getLink)) {
        const tps = isDeclaration(ast) ? ast.typeParameters.map((tp) => make12(toEncoded(tp))) : [];
        const link2 = getLink(tps);
        const to = recur2(link2.to);
        return replaceEncoding(ast, to === link2.to ? [link2] : [new Link(to, link2.transformation)]);
      }
      return replaceEncoding(ast, [unknownToNull]);
    }
    case "Unknown":
    case "ObjectKeyword":
      return replaceEncoding(ast, [unknownToJson]);
    case "Undefined":
    case "Void":
    case "Literal":
    case "Number":
      return ast.toCodecJson();
    case "UniqueSymbol":
    case "Symbol":
    case "BigInt":
      return ast.toCodecStringTree();
    case "Objects": {
      if (ast.propertySignatures.some((ps) => typeof ps.name !== "string")) {
        throw new globalThis.Error("Objects property names must be strings", {
          cause: ast
        });
      }
      return ast.recur(recur2);
    }
    case "Union": {
      const sortedTypes = jsonReorder(ast.types);
      if (sortedTypes !== ast.types) {
        return new Union(sortedTypes, ast.mode, ast.annotations, ast.checks, ast.encoding, ast.context).recur(recur2);
      }
      return ast.recur(recur2);
    }
    case "Arrays":
    case "Suspend":
      return ast.recur(recur2);
  }
  return ast;
}

// node_modules/effect/dist/unstable/http/Headers.js
var TypeId21 = /* @__PURE__ */ Symbol.for("~effect/http/Headers");
var Proto4 = /* @__PURE__ */ Object.create(null);
Object.defineProperties(Proto4, {
  [TypeId21]: {
    value: TypeId21
  },
  [symbolRedactable]: {
    value(context3) {
      return redact3(this, get(context3, CurrentRedactedNames));
    }
  },
  toJSON: {
    value() {
      return redact(this);
    }
  },
  [symbol2]: {
    value(that) {
      return Equivalence3(this, that);
    }
  },
  [symbol]: {
    value() {
      return structure(this);
    }
  },
  toString: {
    value: BaseProto.toString
  },
  [NodeInspectSymbol]: {
    value: BaseProto[NodeInspectSymbol]
  }
});
var make14 = (input) => Object.assign(Object.create(Proto4), input);
var Equivalence3 = /* @__PURE__ */ makeEquivalence2(/* @__PURE__ */ strictEqual());
var empty4 = /* @__PURE__ */ Object.create(Proto4);
var fromInput2 = (input) => {
  if (input === undefined) {
    return empty4;
  } else if (Symbol.iterator in input) {
    const out2 = Object.create(Proto4);
    for (const [k, v] of input) {
      out2[k.toLowerCase()] = v;
    }
    return out2;
  }
  const out = Object.create(Proto4);
  for (const [k, v] of Object.entries(input)) {
    if (Array.isArray(v)) {
      out[k.toLowerCase()] = v.join(", ");
    } else if (v !== undefined) {
      out[k.toLowerCase()] = v;
    }
  }
  return out;
};
var fromRecordUnsafe = (input) => Object.setPrototypeOf(input, Proto4);
var set2 = /* @__PURE__ */ dual(3, (self, key, value2) => {
  const out = make14(self);
  out[key.toLowerCase()] = value2;
  return out;
});
var setAll = /* @__PURE__ */ dual(2, (self, headers) => make14({
  ...self,
  ...fromInput2(headers)
}));
var merge3 = /* @__PURE__ */ dual(2, (self, headers) => {
  const out = make14(self);
  Object.assign(out, headers);
  return out;
});
var remove = /* @__PURE__ */ dual(2, (self, key) => {
  const out = make14(self);
  delete out[key.toLowerCase()];
  return out;
});
var redact3 = /* @__PURE__ */ dual(2, (self, key) => {
  const out = {
    ...self
  };
  const modify = (key2) => {
    if (typeof key2 === "string") {
      const k = key2.toLowerCase();
      if (k in self) {
        out[k] = make8(self[k]);
      }
    } else {
      for (const name in self) {
        if (key2.test(name)) {
          out[name] = make8(self[name]);
        }
      }
    }
  };
  if (Array.isArray(key)) {
    for (let i = 0;i < key.length; i++) {
      modify(key[i]);
    }
  } else {
    modify(key);
  }
  return out;
});
var CurrentRedactedNames = /* @__PURE__ */ Reference("effect/Headers/CurrentRedactedNames", {
  defaultValue: () => ["authorization", "cookie", "set-cookie", "x-api-key"]
});

// node_modules/effect/dist/unstable/http/HttpClient.js
var exports_HttpClient = {};
__export(exports_HttpClient, {
  withScope: () => withScope,
  withRateLimiter: () => withRateLimiter,
  withCookiesRef: () => withCookiesRef,
  transformResponse: () => transformResponse,
  transform: () => transform4,
  tapRequest: () => tapRequest,
  tapError: () => tapError4,
  tap: () => tap3,
  retryTransient: () => retryTransient,
  retry: () => retry4,
  put: () => put2,
  post: () => post2,
  patch: () => patch2,
  options: () => options2,
  mapRequestInputEffect: () => mapRequestInputEffect,
  mapRequestInput: () => mapRequestInput,
  mapRequestEffect: () => mapRequestEffect,
  mapRequest: () => mapRequest,
  makeWith: () => makeWith2,
  make: () => make17,
  layerMergedContext: () => layerMergedContext,
  isHttpClient: () => isHttpClient,
  head: () => head2,
  get: () => get4,
  followRedirects: () => followRedirects,
  filterStatusOk: () => filterStatusOk2,
  filterStatus: () => filterStatus2,
  filterOrFail: () => filterOrFail3,
  filterOrElse: () => filterOrElse3,
  execute: () => execute,
  del: () => del2,
  catchTags: () => catchTags3,
  catchTag: () => catchTag3,
  catch: () => catch_4,
  TracerPropagationEnabled: () => TracerPropagationEnabled,
  TracerDisabledWhen: () => TracerDisabledWhen,
  SpanNameGenerator: () => SpanNameGenerator,
  HttpClient: () => HttpClient
});

// node_modules/effect/dist/Ref.js
var TypeId22 = "~effect/Ref";
var RefProto = {
  [TypeId22]: {
    _A: identity
  },
  ...PipeInspectableProto,
  toJSON() {
    return {
      _id: "Ref",
      ref: this.ref
    };
  }
};
var get2 = (self) => sync2(() => self.ref.current);
var update2 = /* @__PURE__ */ dual(2, (self, f) => sync2(() => {
  self.ref.current = f(self.ref.current);
}));

// node_modules/effect/dist/unstable/http/Cookies.js
var TypeId23 = "~effect/http/Cookies";
var CookieTypeId = "~effect/http/Cookies/Cookie";
var Proto5 = {
  [TypeId23]: TypeId23,
  ...BaseProto,
  toJSON() {
    return {
      _id: "effect/Cookies",
      cookies: map2(this.cookies, (cookie) => cookie.toJSON())
    };
  },
  pipe() {
    return pipeArguments(this, arguments);
  }
};
var fromReadonlyRecord = (cookies) => {
  const self = Object.create(Proto5);
  self.cookies = cookies;
  return self;
};
var fromIterable2 = (cookies) => {
  const record2 = {};
  for (const cookie of cookies) {
    record2[cookie.name] = cookie;
  }
  return fromReadonlyRecord(record2);
};
var fromSetCookie = (headers) => {
  const arrayHeaders = typeof headers === "string" ? [headers] : headers;
  const cookies = [];
  for (const header of arrayHeaders) {
    const cookie = parseSetCookie(header.trim());
    if (cookie) {
      cookies.push(cookie);
    }
  }
  return fromIterable2(cookies);
};
function parseSetCookie(header) {
  const parts2 = header.split(";").map((_) => _.trim()).filter((_) => _ !== "");
  if (parts2.length === 0) {
    return;
  }
  const firstEqual = parts2[0].indexOf("=");
  if (firstEqual === -1) {
    return;
  }
  const name = parts2[0].slice(0, firstEqual);
  if (!fieldContentRegExp.test(name)) {
    return;
  }
  const valueEncoded = parts2[0].slice(firstEqual + 1);
  const value2 = tryDecodeURIComponent(valueEncoded);
  if (parts2.length === 1) {
    return Object.assign(Object.create(CookieProto), {
      name,
      value: value2,
      valueEncoded
    });
  }
  const options = {};
  for (let i = 1;i < parts2.length; i++) {
    const part = parts2[i];
    const equalIndex = part.indexOf("=");
    const key = equalIndex === -1 ? part : part.slice(0, equalIndex).trim();
    const value3 = equalIndex === -1 ? undefined : part.slice(equalIndex + 1).trim();
    switch (key.toLowerCase()) {
      case "domain": {
        if (value3 === undefined) {
          break;
        }
        const domain = value3.trim().replace(/^\./, "");
        if (domain) {
          options.domain = domain;
        }
        break;
      }
      case "expires": {
        if (value3 === undefined) {
          break;
        }
        const date = new Date(value3);
        if (!isNaN(date.getTime())) {
          options.expires = date;
        }
        break;
      }
      case "max-age": {
        if (value3 === undefined) {
          break;
        }
        const maxAge = parseInt(value3, 10);
        if (!isNaN(maxAge)) {
          options.maxAge = seconds(maxAge);
        }
        break;
      }
      case "path": {
        if (value3 === undefined) {
          break;
        }
        if (value3[0] === "/") {
          options.path = value3;
        }
        break;
      }
      case "priority": {
        if (value3 === undefined) {
          break;
        }
        switch (value3.toLowerCase()) {
          case "low":
            options.priority = "low";
            break;
          case "medium":
            options.priority = "medium";
            break;
          case "high":
            options.priority = "high";
            break;
        }
        break;
      }
      case "httponly": {
        options.httpOnly = true;
        break;
      }
      case "secure": {
        options.secure = true;
        break;
      }
      case "partitioned": {
        options.partitioned = true;
        break;
      }
      case "samesite": {
        if (value3 === undefined) {
          break;
        }
        switch (value3.toLowerCase()) {
          case "lax":
            options.sameSite = "lax";
            break;
          case "strict":
            options.sameSite = "strict";
            break;
          case "none":
            options.sameSite = "none";
            break;
        }
        break;
      }
    }
  }
  return Object.assign(Object.create(CookieProto), {
    name,
    value: value2,
    valueEncoded,
    options: Object.keys(options).length > 0 ? options : undefined
  });
}
var isEmpty = (self) => isEmptyRecord(self.cookies);
var fieldContentRegExp = /^[\u0009\u0020-\u007e\u0080-\u00ff]+$/;
var CookieProto = {
  [CookieTypeId]: CookieTypeId,
  ...BaseProto,
  toJSON() {
    return {
      _id: "effect/Cookies/Cookie",
      name: this.name,
      value: this.value,
      options: this.options
    };
  }
};
var merge4 = /* @__PURE__ */ dual(2, (self, that) => fromReadonlyRecord({
  ...self.cookies,
  ...that.cookies
}));
var toCookieHeader = (self) => Object.values(self.cookies).map((cookie) => `${cookie.name}=${cookie.valueEncoded}`).join("; ");
var tryDecodeURIComponent = (str) => {
  try {
    return decodeURIComponent(str);
  } catch (_) {
    return str;
  }
};

// node_modules/effect/dist/unstable/http/HttpClientError.js
var TypeId24 = "~effect/http/HttpClientError";
var isHttpClientError = (u) => hasProperty(u, TypeId24);

class HttpClientError extends (/* @__PURE__ */ TaggedError2("HttpClientError")) {
  constructor(props) {
    if ("cause" in props.reason) {
      super({
        ...props,
        cause: props.reason.cause
      });
    } else {
      super(props);
    }
  }
  [TypeId24] = TypeId24;
  get request() {
    return this.reason.request;
  }
  get response() {
    return "response" in this.reason ? this.reason.response : undefined;
  }
  get message() {
    return this.reason.message;
  }
}
var formatReason = (tag2) => tag2.endsWith("Error") ? tag2.slice(0, -5) : tag2;
var formatMessage = (reason, description, info) => description ? `${reason}: ${description} (${info})` : `${reason} error (${info})`;

class TransportError extends (/* @__PURE__ */ TaggedError2("TransportError")) {
  get methodAndUrl() {
    return `${this.request.method} ${this.request.url}`;
  }
  get message() {
    return formatMessage(formatReason(this._tag), this.description, this.methodAndUrl);
  }
}
class InvalidUrlError extends (/* @__PURE__ */ TaggedError2("InvalidUrlError")) {
  get methodAndUrl() {
    return `${this.request.method} ${this.request.url}`;
  }
  get message() {
    return formatMessage(formatReason(this._tag), this.description, this.methodAndUrl);
  }
}

class StatusCodeError extends (/* @__PURE__ */ TaggedError2("StatusCodeError")) {
  get methodAndUrl() {
    return `${this.request.method} ${this.request.url}`;
  }
  get message() {
    const info = `${this.response.status} ${this.methodAndUrl}`;
    return formatMessage(formatReason(this._tag), this.description, info);
  }
}

class DecodeError extends (/* @__PURE__ */ TaggedError2("DecodeError")) {
  get methodAndUrl() {
    return `${this.request.method} ${this.request.url}`;
  }
  get message() {
    const info = `${this.response.status} ${this.methodAndUrl}`;
    return formatMessage(formatReason(this._tag), this.description, info);
  }
}

class EmptyBodyError extends (/* @__PURE__ */ TaggedError2("EmptyBodyError")) {
  get methodAndUrl() {
    return `${this.request.method} ${this.request.url}`;
  }
  get message() {
    const info = `${this.response.status} ${this.methodAndUrl}`;
    return formatMessage(formatReason(this._tag), this.description, info);
  }
}

// node_modules/effect/dist/unstable/http/HttpClientRequest.js
var exports_HttpClientRequest = {};
__export(exports_HttpClientRequest, {
  updateUrl: () => updateUrl,
  trace: () => trace,
  toWebResult: () => toWebResult,
  toWeb: () => toWeb,
  toUrl: () => toUrl,
  setUrlParams: () => setUrlParams,
  setUrlParam: () => setUrlParam,
  setUrl: () => setUrl,
  setMethod: () => setMethod,
  setHeaders: () => setHeaders,
  setHeader: () => setHeader,
  setHash: () => setHash,
  setBody: () => setBody,
  schemaBodyJson: () => schemaBodyJson,
  removeHash: () => removeHash,
  put: () => put,
  prependUrl: () => prependUrl,
  post: () => post,
  patch: () => patch,
  options: () => options,
  modify: () => modify,
  makeWith: () => makeWith,
  make: () => make16,
  isHttpClientRequest: () => isHttpClientRequest,
  head: () => head,
  get: () => get3,
  fromWeb: () => fromWeb,
  empty: () => empty7,
  delete: () => del,
  bodyUrlParams: () => bodyUrlParams,
  bodyUint8Array: () => bodyUint8Array,
  bodyText: () => bodyText,
  bodyStream: () => bodyStream,
  bodyJsonUnsafe: () => bodyJsonUnsafe,
  bodyJson: () => bodyJson,
  bodyFormDataRecord: () => bodyFormDataRecord,
  bodyFormData: () => bodyFormData,
  bodyFile: () => bodyFile,
  bearerToken: () => bearerToken,
  basicAuth: () => basicAuth,
  appendUrlParams: () => appendUrlParams,
  appendUrlParam: () => appendUrlParam,
  appendUrl: () => appendUrl,
  acceptJson: () => acceptJson,
  accept: () => accept
});

// node_modules/effect/dist/FileSystem.js
var bigint1024 = /* @__PURE__ */ BigInt(1024);
var bigintPiB = bigint1024 * bigint1024 * bigint1024 * bigint1024 * bigint1024;
var FileSystem2 = /* @__PURE__ */ Service("effect/platform/FileSystem");

// node_modules/effect/dist/unstable/http/UrlParams.js
var TypeId25 = "~effect/http/UrlParams";
var Proto6 = {
  ...PipeInspectableProto,
  [TypeId25]: TypeId25,
  [Symbol.iterator]() {
    return this.params[Symbol.iterator]();
  },
  toJSON() {
    return {
      _id: "UrlParams",
      params: Object.fromEntries(this.params)
    };
  },
  [symbol2](that) {
    return Equivalence4(this, that);
  },
  [symbol]() {
    return array(this.params.flat());
  }
};
var make15 = (params) => {
  const self = Object.create(Proto6);
  self.params = params;
  return self;
};
var fromInput3 = (input) => {
  const parsed = fromInputNested(input);
  const out = [];
  for (let i = 0;i < parsed.length; i++) {
    if (Array.isArray(parsed[i][0])) {
      const [keys2, value2] = parsed[i];
      out.push([`${keys2[0]}[${keys2.slice(1).join("][")}]`, value2]);
    } else {
      out.push(parsed[i]);
    }
  }
  return make15(out);
};
var fromInputNested = (input) => {
  const entries = typeof input[Symbol.iterator] === "function" ? fromIterable(input) : Object.entries(input);
  const out = [];
  for (const [key, value2] of entries) {
    if (Array.isArray(value2)) {
      for (let i = 0;i < value2.length; i++) {
        if (value2[i] !== undefined) {
          out.push([key, String(value2[i])]);
        }
      }
    } else if (typeof value2 === "object") {
      const nested = fromInputNested(value2);
      for (const [k, v] of nested) {
        out.push([[key, ...typeof k === "string" ? [k] : k], v]);
      }
    } else if (value2 !== undefined) {
      out.push([key, String(value2)]);
    }
  }
  return out;
};
var Equivalence4 = /* @__PURE__ */ make3((a, b) => arrayEquivalence(a.params, b.params));
var arrayEquivalence = /* @__PURE__ */ makeEquivalence3(/* @__PURE__ */ makeEquivalence([/* @__PURE__ */ strictEqual(), /* @__PURE__ */ strictEqual()]));
var empty5 = /* @__PURE__ */ make15([]);
var set4 = /* @__PURE__ */ dual(3, (self, key, value2) => make15(append(filter3(self.params, ([k]) => k !== key), [key, String(value2)])));
var transform3 = /* @__PURE__ */ dual(2, (self, f) => make15(f(self.params)));
var setAll2 = /* @__PURE__ */ dual(2, (self, input) => {
  const out = fromInput3(input);
  const params = out.params;
  const keys2 = new Set;
  for (let i = 0;i < params.length; i++) {
    keys2.add(params[i][0]);
  }
  for (let i = 0;i < self.params.length; i++) {
    if (keys2.has(self.params[i][0]))
      continue;
    params.push(self.params[i]);
  }
  return out;
});
var append2 = /* @__PURE__ */ dual(3, (self, key, value2) => make15(append(self.params, [key, String(value2)])));
var appendAll2 = /* @__PURE__ */ dual(2, (self, input) => transform3(self, appendAll(fromInput3(input).params)));
class UrlParamsError extends (/* @__PURE__ */ TaggedError2("UrlParamsError")) {
}
var makeUrl = (url, params, hash2) => {
  try {
    const urlInstance = new URL(url, baseUrl());
    for (let i = 0;i < params.params.length; i++) {
      const [key, value2] = params.params[i];
      if (value2 !== undefined) {
        urlInstance.searchParams.append(key, value2);
      }
    }
    if (hash2 !== undefined) {
      urlInstance.hash = hash2;
    }
    return succeed2(urlInstance);
  } catch (e) {
    return fail2(new UrlParamsError({
      cause: e
    }));
  }
};
var toString = (self) => new URLSearchParams(self.params).toString();
var baseUrl = () => {
  if ("location" in globalThis && globalThis.location !== undefined && globalThis.location.origin !== undefined && globalThis.location.pathname !== undefined) {
    return location.origin + location.pathname;
  }
  return;
};

// node_modules/effect/dist/unstable/http/HttpBody.js
var TypeId26 = "~effect/http/HttpBody";
var HttpBodyErrorTypeId = "~effect/http/HttpBody/HttpBodyError";

class HttpBodyError extends (/* @__PURE__ */ TaggedError2("HttpBodyError")) {
  [HttpBodyErrorTypeId] = HttpBodyErrorTypeId;
}

class Proto7 {
  [TypeId26];
  constructor() {
    this[TypeId26] = TypeId26;
  }
  [NodeInspectSymbol]() {
    return this.toJSON();
  }
  toString() {
    return format(this, {
      ignoreToString: true
    });
  }
}

class Empty extends Proto7 {
  _tag = "Empty";
  toJSON() {
    return {
      _id: "effect/HttpBody",
      _tag: "Empty"
    };
  }
}
var empty6 = /* @__PURE__ */ new Empty;

class Raw extends Proto7 {
  _tag = "Raw";
  body;
  contentType;
  contentLength;
  constructor(body, contentType, contentLength) {
    super();
    this.body = body;
    this.contentType = contentType;
    this.contentLength = contentLength;
  }
  toJSON() {
    return {
      _id: "effect/HttpBody",
      _tag: "Raw",
      body: this.body,
      contentType: this.contentType,
      contentLength: this.contentLength
    };
  }
}
var raw = (body, options) => new Raw(body, options?.contentType, options?.contentLength);

class Uint8Array3 extends Proto7 {
  _tag = "Uint8Array";
  body;
  contentType;
  contentLength;
  constructor(body, contentType, contentLength) {
    super();
    this.body = body;
    this.contentType = contentType;
    this.contentLength = contentLength;
  }
  toJSON() {
    const toString2 = this.contentType.startsWith("text/") || this.contentType.endsWith("json");
    return {
      _id: "effect/HttpBody",
      _tag: "Uint8Array",
      body: toString2 ? new TextDecoder().decode(this.body) : `Uint8Array(${this.body.length})`,
      contentType: this.contentType,
      contentLength: this.contentLength
    };
  }
}
var uint8Array = (body, contentType) => new Uint8Array3(body, contentType ?? "application/octet-stream", body.length);
var encoder2 = /* @__PURE__ */ new TextEncoder;
var text = (body, contentType) => uint8Array(encoder2.encode(body), contentType ?? "text/plain");
var jsonUnsafe = (body, contentType) => text(JSON.stringify(body), contentType ?? "application/json");
var json = (body, contentType) => try_3({
  try: () => text(JSON.stringify(body), contentType ?? "application/json"),
  catch: (cause) => new HttpBodyError({
    reason: {
      _tag: "JsonError"
    },
    cause
  })
});
var jsonSchema = (schema, options) => {
  const encode = encodeUnknownEffect(toCodecJson(schema));
  return (body, contentType) => encode(body, options).pipe(mapError3((issue) => new HttpBodyError({
    reason: {
      _tag: "SchemaError",
      issue
    },
    cause: issue
  })), flatMap2((body2) => json(body2, contentType)));
};
var urlParams = (urlParams2, contentType) => text(toString(urlParams2), contentType ?? "application/x-www-form-urlencoded");

class FormData3 extends Proto7 {
  _tag = "FormData";
  contentType = undefined;
  contentLength = undefined;
  formData;
  constructor(formData) {
    super();
    this.formData = formData;
  }
  toJSON() {
    return {
      _id: "effect/HttpBody",
      _tag: "FormData",
      formData: this.formData
    };
  }
}
var formData = (body) => new FormData3(body);
var appendFormDataValue = (formData2, key, value2) => {
  if (value2 == null) {
    return;
  }
  if (typeof value2 === "object") {
    formData2.append(key, value2);
    return;
  }
  formData2.append(key, String(value2));
};
var formDataRecord = (entries) => {
  const data = new globalThis.FormData;
  for (const [key, value2] of Object.entries(entries)) {
    if (Array.isArray(value2)) {
      for (const item of value2) {
        appendFormDataValue(data, key, item);
      }
    } else {
      appendFormDataValue(data, key, value2);
    }
  }
  return formData(data);
};

class Stream2 extends Proto7 {
  _tag = "Stream";
  stream;
  contentType;
  contentLength;
  constructor(stream, contentType, contentLength) {
    super();
    this.stream = stream;
    this.contentType = contentType;
    this.contentLength = contentLength;
  }
  toJSON() {
    return {
      _id: "effect/HttpBody",
      _tag: "Stream",
      contentType: this.contentType,
      contentLength: this.contentLength
    };
  }
}
var stream = (body, contentType, contentLength) => new Stream2(body, contentType ?? "application/octet-stream", contentLength);
var file = (path, options) => flatMap2(FileSystem2, (fs) => map5(fs.stat(path), (info) => stream(fs.stream(path, options), options?.contentType, Number(info.size))));

// node_modules/effect/dist/unstable/http/HttpMethod.js
var hasBody = (method) => method !== "GET" && method !== "HEAD" && method !== "OPTIONS" && method !== "TRACE";
var allShort = [["GET", "get"], ["POST", "post"], ["PUT", "put"], ["DELETE", "del"], ["PATCH", "patch"], ["HEAD", "head"], ["OPTIONS", "options"], ["TRACE", "trace"]];

// node_modules/effect/dist/unstable/http/HttpClientRequest.js
var TypeId27 = "~effect/http/HttpClientRequest";
var isHttpClientRequest = (u) => hasProperty(u, TypeId27);
var Proto8 = {
  [TypeId27]: TypeId27,
  ...BaseProto,
  toJSON() {
    return {
      _id: "HttpClientRequest",
      method: this.method,
      url: this.url,
      urlParams: this.urlParams,
      hash: this.hash,
      headers: redact(this.headers),
      body: this.body.toJSON()
    };
  },
  pipe() {
    return pipeArguments(this, arguments);
  }
};
function makeWith(method, url, urlParams2, hash2, headers, body) {
  const self = Object.create(Proto8);
  self.method = method;
  self.url = url;
  self.urlParams = urlParams2;
  self.hash = hash2;
  self.headers = headers;
  self.body = body;
  return self;
}
var empty7 = /* @__PURE__ */ makeWith("GET", "", empty5, /* @__PURE__ */ none2(), empty4, empty6);
var make16 = (method) => (url, options) => modify(empty7, {
  method,
  url,
  ...options ?? undefined
});
var get3 = /* @__PURE__ */ make16("GET");
var post = /* @__PURE__ */ make16("POST");
var patch = /* @__PURE__ */ make16("PATCH");
var put = /* @__PURE__ */ make16("PUT");
var del = /* @__PURE__ */ make16("DELETE");
var head = /* @__PURE__ */ make16("HEAD");
var options = /* @__PURE__ */ make16("OPTIONS");
var trace = /* @__PURE__ */ make16("TRACE");
var modify = /* @__PURE__ */ dual(2, (self, options2) => {
  let result3 = self;
  if (options2.method) {
    result3 = setMethod(result3, options2.method);
  }
  if (options2.url) {
    result3 = setUrl(result3, options2.url);
  }
  if (options2.headers) {
    result3 = setHeaders(result3, options2.headers);
  }
  if (options2.urlParams) {
    result3 = setUrlParams(result3, options2.urlParams);
  }
  if (options2.hash) {
    result3 = setHash(result3, options2.hash);
  }
  if (options2.body) {
    result3 = setBody(result3, options2.body);
  }
  if (options2.accept) {
    result3 = accept(result3, options2.accept);
  }
  if (options2.acceptJson) {
    result3 = acceptJson(result3);
  }
  return result3;
});
var setMethod = /* @__PURE__ */ dual(2, (self, method) => makeWith(method, self.url, self.urlParams, self.hash, self.headers, self.body));
var setHeader = /* @__PURE__ */ dual(3, (self, key, value2) => makeWith(self.method, self.url, self.urlParams, self.hash, set2(self.headers, key, value2), self.body));
var setHeaders = /* @__PURE__ */ dual(2, (self, input) => makeWith(self.method, self.url, self.urlParams, self.hash, setAll(self.headers, input), self.body));
var basicAuth = /* @__PURE__ */ dual(3, (self, username, password) => setHeader(self, "Authorization", `Basic ${btoa(`${stringOrRedacted(username)}:${stringOrRedacted(password)}`)}`));
var bearerToken = /* @__PURE__ */ dual(2, (self, token) => setHeader(self, "Authorization", `Bearer ${stringOrRedacted(token)}`));
var accept = /* @__PURE__ */ dual(2, (self, mediaType) => setHeader(self, "Accept", mediaType));
var acceptJson = /* @__PURE__ */ accept("application/json");
var setUrl = /* @__PURE__ */ dual(2, (self, url) => {
  if (typeof url === "string") {
    return makeWith(self.method, url, self.urlParams, self.hash, self.headers, self.body);
  }
  const clone = new URL(url.toString());
  const urlParams2 = fromInput3(clone.searchParams);
  const hash2 = fromNullishOr(clone.hash === "" ? undefined : clone.hash.slice(1));
  clone.search = "";
  clone.hash = "";
  return makeWith(self.method, clone.toString(), urlParams2, hash2, self.headers, self.body);
});
var prependUrl = /* @__PURE__ */ dual(2, (self, path) => {
  if (path === "")
    return self;
  return makeWith(self.method, joinSegments(path, self.url), self.urlParams, self.hash, self.headers, self.body);
});
var appendUrl = /* @__PURE__ */ dual(2, (self, path) => {
  if (path === "")
    return self;
  return makeWith(self.method, joinSegments(self.url, path), self.urlParams, self.hash, self.headers, self.body);
});
var joinSegments = (first, second) => {
  const endsWithSlash = first.endsWith("/");
  const startsWithSlash = second.startsWith("/");
  const needsTrim = endsWithSlash && startsWithSlash;
  const needsSlash = !endsWithSlash && !startsWithSlash;
  return needsTrim ? first + second.slice(1) : needsSlash ? first + "/" + second : first + second;
};
var updateUrl = /* @__PURE__ */ dual(2, (self, f) => makeWith(self.method, f(self.url), self.urlParams, self.hash, self.headers, self.body));
var setUrlParam = /* @__PURE__ */ dual(3, (self, key, value2) => makeWith(self.method, self.url, set4(self.urlParams, key, value2), self.hash, self.headers, self.body));
var setUrlParams = /* @__PURE__ */ dual(2, (self, input) => makeWith(self.method, self.url, setAll2(self.urlParams, input), self.hash, self.headers, self.body));
var appendUrlParam = /* @__PURE__ */ dual(3, (self, key, value2) => makeWith(self.method, self.url, append2(self.urlParams, key, value2), self.hash, self.headers, self.body));
var appendUrlParams = /* @__PURE__ */ dual(2, (self, input) => makeWith(self.method, self.url, appendAll2(self.urlParams, input), self.hash, self.headers, self.body));
var setHash = /* @__PURE__ */ dual(2, (self, hash2) => makeWith(self.method, self.url, self.urlParams, some2(hash2), self.headers, self.body));
var removeHash = (self) => makeWith(self.method, self.url, self.urlParams, none2(), self.headers, self.body);
var setBody = /* @__PURE__ */ dual(2, (self, body) => {
  let headers = self.headers;
  if (body._tag === "Empty" || body._tag === "FormData") {
    headers = remove(remove(headers, "Content-Type"), "Content-length");
  } else {
    if (body.contentType) {
      headers = set2(headers, "content-type", body.contentType);
    }
    if (body.contentLength !== undefined) {
      headers = set2(headers, "content-length", body.contentLength.toString());
    }
  }
  return makeWith(self.method, self.url, self.urlParams, self.hash, headers, body);
});
var bodyUint8Array = /* @__PURE__ */ dual((args2) => isHttpClientRequest(args2[0]), (self, body, contentType) => setBody(self, uint8Array(body, contentType)));
var bodyText = /* @__PURE__ */ dual((args2) => isHttpClientRequest(args2[0]), (self, body, contentType) => setBody(self, text(body, contentType)));
var bodyJson = /* @__PURE__ */ dual(2, (self, body) => map5(json(body), (body2) => setBody(self, body2)));
var bodyJsonUnsafe = /* @__PURE__ */ dual(2, (self, body) => setBody(self, jsonUnsafe(body)));
var schemaBodyJson = (schema, options2) => {
  const encode = jsonSchema(schema, options2);
  return dual(2, (self, body) => map5(encode(body), (body2) => setBody(self, body2)));
};
var bodyUrlParams = /* @__PURE__ */ dual(2, (self, input) => setBody(self, urlParams(fromInput3(input))));
var bodyFormData = /* @__PURE__ */ dual(2, (self, body) => setBody(self, formData(body)));
var bodyFormDataRecord = /* @__PURE__ */ dual(2, (self, entries) => setBody(self, formDataRecord(entries)));
var bodyStream = /* @__PURE__ */ dual((args2) => isHttpClientRequest(args2[0]), (self, body, options2) => setBody(self, stream(body, options2?.contentType, options2?.contentLength)));
var bodyFile = /* @__PURE__ */ dual((args2) => isHttpClientRequest(args2[0]), (self, path, options2) => map5(file(path, options2), (body) => setBody(self, body)));
function toUrl(self) {
  const r = makeUrl(self.url, self.urlParams, getOrUndefined(self.hash));
  if (isSuccess2(r)) {
    return some2(r.success);
  }
  return none2();
}
var fromWeb = (request3) => {
  const method = request3.method.toUpperCase();
  return modify(empty7, {
    method,
    url: new URL(request3.url),
    headers: request3.headers,
    body: fromWebBody(request3, method)
  });
};
var fromWebBody = (request3, method) => {
  if (!hasBody(method) || request3.body === null) {
    return empty6;
  }
  return raw(request3.body, {
    contentType: request3.headers.get("content-type") ?? undefined,
    contentLength: parseContentLength(request3.headers.get("content-length"))
  });
};
var parseContentLength = (contentLength) => {
  if (contentLength === null) {
    return;
  }
  const parsed = Number.parseInt(contentLength, 10);
  return Number.isNaN(parsed) ? undefined : parsed;
};
var toWebResult = (self, options2) => {
  const url = makeUrl(self.url, self.urlParams, getOrUndefined(self.hash));
  if (isFailure2(url)) {
    return fail2(url.failure);
  }
  const requestInit = {
    method: self.method,
    headers: self.headers
  };
  if (options2?.signal) {
    requestInit.signal = options2.signal;
  }
  if (hasBody(self.method)) {
    switch (self.body._tag) {
      case "Empty": {
        break;
      }
      case "Raw": {
        requestInit.body = self.body.body;
        if (isReadableStream(self.body.body)) {
          requestInit.duplex = "half";
        }
        break;
      }
      case "Uint8Array": {
        requestInit.body = self.body.body;
        break;
      }
      case "FormData": {
        requestInit.body = self.body.formData;
        break;
      }
      case "Stream": {
        requestInit.body = toReadableStreamWith(self.body.stream, options2?.context ?? empty());
        requestInit.duplex = "half";
        break;
      }
    }
  }
  return try_({
    try: () => new Request(url.success, requestInit),
    catch: (cause) => new UrlParamsError({
      cause
    })
  });
};
var isReadableStream = (u) => typeof ReadableStream !== "undefined" && u instanceof ReadableStream;
var toWeb = (self, options2) => contextWith2((context3) => fromResult2(toWebResult(self, {
  context: context3,
  signal: options2?.signal
})));

// node_modules/effect/dist/unstable/http/HttpIncomingMessage.js
var TypeId28 = "~effect/http/HttpIncomingMessage";
var inspect = (self, that) => {
  const contentType = self.headers["content-type"] ?? "";
  let body;
  if (contentType.includes("application/json")) {
    try {
      body = runSync2(self.json);
    } catch (_) {}
  } else if (contentType.includes("text/") || contentType.includes("urlencoded")) {
    try {
      body = runSync2(self.text);
    } catch (_) {}
  }
  const obj = {
    ...that,
    headers: redact(self.headers),
    remoteAddress: self.remoteAddress
  };
  if (body !== undefined) {
    obj.body = body;
  }
  return obj;
};

// node_modules/effect/dist/unstable/http/HttpClientResponse.js
var TypeId29 = "~effect/http/HttpClientResponse";
var fromWeb2 = (request3, source) => new WebHttpClientResponse(request3, source);
var filterStatus = /* @__PURE__ */ dual(2, (self, f) => suspend2(() => f(self.status) ? succeed5(self) : fail5(new HttpClientError({
  reason: new StatusCodeError({
    response: self,
    request: self.request,
    description: "invalid status code"
  })
}))));
var filterStatusOk = (self) => self.status >= 200 && self.status < 300 ? succeed5(self) : fail5(new HttpClientError({
  reason: new StatusCodeError({
    response: self,
    request: self.request,
    description: "non 2xx status code"
  })
}));

class WebHttpClientResponse extends Class2 {
  [TypeId28];
  [TypeId29];
  request;
  source;
  constructor(request3, source) {
    super();
    this.request = request3;
    this.source = source;
    this[TypeId28] = TypeId28;
    this[TypeId29] = TypeId29;
  }
  toJSON() {
    return inspect(this, {
      _id: "HttpClientResponse",
      request: this.request.toJSON(),
      status: this.status
    });
  }
  get status() {
    return this.source.status;
  }
  get headers() {
    return fromInput2(this.source.headers);
  }
  cachedCookies;
  get cookies() {
    if (this.cachedCookies) {
      return this.cachedCookies;
    }
    return this.cachedCookies = fromSetCookie(this.source.headers.getSetCookie());
  }
  get remoteAddress() {
    return none2();
  }
  get stream() {
    return this.source.body ? fromReadableStream({
      evaluate: () => this.source.body,
      onError: (cause) => new HttpClientError({
        reason: new DecodeError({
          request: this.request,
          response: this,
          cause
        })
      })
    }) : fail7(new HttpClientError({
      reason: new EmptyBodyError({
        request: this.request,
        response: this,
        description: "can not create stream from empty body"
      })
    }));
  }
  get json() {
    return flatMap2(this.text, (text2) => try_3({
      try: () => text2 === "" ? null : JSON.parse(text2),
      catch: (cause) => new HttpClientError({
        reason: new DecodeError({
          request: this.request,
          response: this,
          cause
        })
      })
    }));
  }
  textBody;
  get text() {
    if (this.textBody) {
      return this.textBody;
    }
    this.textBody = tryPromise2({
      try: () => this.source.text(),
      catch: (cause) => new HttpClientError({
        reason: new DecodeError({
          request: this.request,
          response: this,
          cause
        })
      })
    }).pipe(cached2, runSync2);
    this.arrayBufferBody = map5(this.textBody, (_) => new TextEncoder().encode(_).buffer);
    return this.textBody;
  }
  get urlParamsBody() {
    return flatMap2(this.text, (_) => try_3({
      try: () => fromInput3(new URLSearchParams(_)),
      catch: (cause) => new HttpClientError({
        reason: new DecodeError({
          request: this.request,
          response: this,
          cause
        })
      })
    }));
  }
  formDataBody;
  get formData() {
    return this.formDataBody ??= tryPromise2({
      try: () => this.source.formData(),
      catch: (cause) => new HttpClientError({
        reason: new DecodeError({
          request: this.request,
          response: this,
          cause
        })
      })
    }).pipe(cached2, runSync2);
  }
  arrayBufferBody;
  get arrayBuffer() {
    if (this.arrayBufferBody) {
      return this.arrayBufferBody;
    }
    this.arrayBufferBody = tryPromise2({
      try: () => this.source.arrayBuffer(),
      catch: (cause) => new HttpClientError({
        reason: new DecodeError({
          request: this.request,
          response: this,
          cause
        })
      })
    }).pipe(cached2, runSync2);
    this.textBody = map5(this.arrayBufferBody, (_) => new TextDecoder().decode(_));
    return this.arrayBufferBody;
  }
  pipe() {
    return pipeArguments(this, arguments);
  }
}

// node_modules/effect/dist/unstable/http/HttpTraceContext.js
var toHeaders = (span) => fromRecordUnsafe({
  b3: `${span.traceId}-${span.spanId}-${span.sampled ? "1" : "0"}${match(span.parent, {
    onNone: () => "",
    onSome: (parent) => `-${parent.spanId}`
  })}`,
  traceparent: `00-${span.traceId}-${span.spanId}-${span.sampled ? "01" : "00"}`
});

// node_modules/effect/dist/unstable/http/HttpClient.js
var TypeId30 = "~effect/http/HttpClient";
var isHttpClient = (u) => hasProperty(u, TypeId30);
var HttpClient = /* @__PURE__ */ Service("effect/HttpClient");
var accessor = (method) => (...args2) => flatMap2(HttpClient, (client) => client[method](...args2));
var execute = /* @__PURE__ */ accessor("execute");
var get4 = /* @__PURE__ */ accessor("get");
var head2 = /* @__PURE__ */ accessor("head");
var post2 = /* @__PURE__ */ accessor("post");
var patch2 = /* @__PURE__ */ accessor("patch");
var put2 = /* @__PURE__ */ accessor("put");
var del2 = /* @__PURE__ */ accessor("del");
var options2 = /* @__PURE__ */ accessor("options");
var transform4 = /* @__PURE__ */ dual(2, (self, f) => makeWith2(flatMap2((request3) => f(self.postprocess(succeed5(request3)), request3)), self.preprocess));
var transformResponse = /* @__PURE__ */ dual(2, (self, f) => makeWith2((request3) => f(self.postprocess(request3)), self.preprocess));
var catch_4 = /* @__PURE__ */ dual(2, (self, f) => transformResponse(self, catch_2(f)));
var catchTag3 = /* @__PURE__ */ dual(3, (self, tag2, f) => transformResponse(self, (effect2) => catchTag2(effect2, tag2, f)));
var catchTags3 = /* @__PURE__ */ dual(2, (self, cases) => transformResponse(self, catchTags2(cases)));
var filterOrElse3 = /* @__PURE__ */ dual(3, (self, f, orElse) => transformResponse(self, filterOrElse2(f, orElse)));
var filterOrFail3 = /* @__PURE__ */ dual(3, (self, f, orFailWith) => transformResponse(self, filterOrFail2(f, orFailWith)));
var filterStatus2 = /* @__PURE__ */ dual(2, (self, f) => transformResponse(self, flatMap2(filterStatus(f))));
var filterStatusOk2 = /* @__PURE__ */ transformResponse(/* @__PURE__ */ flatMap2(filterStatusOk));
var makeWith2 = (postprocess, preprocess) => {
  const self = Object.create(Proto9);
  self.preprocess = preprocess;
  self.postprocess = postprocess;
  self.execute = function(request3) {
    return postprocess(preprocess(request3));
  };
  return self;
};
var Proto9 = {
  [TypeId30]: TypeId30,
  pipe() {
    return pipeArguments(this, arguments);
  },
  ...BaseProto,
  toJSON() {
    return {
      _id: "effect/HttpClient"
    };
  },
  .../* @__PURE__ */ Object.fromEntries(/* @__PURE__ */ allShort.map(([fullMethod, method]) => [method, function(url, options3) {
    return this.execute(make16(fullMethod)(url, options3));
  }]))
};
var make17 = (f) => makeWith2((effect2) => flatMap2(effect2, (request3) => withFiber2((fiber3) => {
  const scopedController = scopedRequests.get(request3);
  const controller = scopedController ?? new AbortController;
  const urlResult = makeUrl(request3.url, request3.urlParams, getOrUndefined(request3.hash));
  if (isFailure2(urlResult)) {
    return fail5(new HttpClientError({
      reason: new InvalidUrlError({
        request: request3,
        cause: urlResult.failure
      })
    }));
  }
  const url = urlResult.success;
  const tracerDisabled = fiber3.getRef(DisablePropagation) || fiber3.getRef(TracerDisabledWhen)(request3);
  if (tracerDisabled) {
    const effect3 = f(request3, url, controller.signal, fiber3);
    if (scopedController)
      return effect3;
    return uninterruptibleMask2((restore) => matchCauseEffect2(restore(effect3), {
      onSuccess(response) {
        responseRegistry.register(response, controller);
        return succeed5(new InterruptibleResponse(response, controller));
      },
      onFailure(cause) {
        if (hasInterrupts2(cause)) {
          controller.abort();
        }
        return failCause3(cause);
      }
    }));
  }
  return useSpan2(fiber3.getRef(SpanNameGenerator)(request3), {
    kind: "client"
  }, (span) => {
    span.attribute("http.request.method", request3.method);
    span.attribute("server.address", url.origin);
    if (url.port !== "") {
      span.attribute("server.port", +url.port);
    }
    span.attribute("url.full", url.toString());
    span.attribute("url.path", url.pathname);
    span.attribute("url.scheme", url.protocol.slice(0, -1));
    const query = url.search.slice(1);
    if (query !== "") {
      span.attribute("url.query", query);
    }
    const redactedHeaderNames = fiber3.getRef(CurrentRedactedNames);
    const redactedHeaders = redact3(request3.headers, redactedHeaderNames);
    for (const name in redactedHeaders) {
      span.attribute(`http.request.header.${name}`, String(redactedHeaders[name]));
    }
    request3 = fiber3.getRef(TracerPropagationEnabled) ? setHeaders(request3, toHeaders(span)) : request3;
    return uninterruptibleMask2((restore) => restore(f(request3, url, controller.signal, fiber3)).pipe(withParentSpan2(span, {
      captureStackTrace: false
    }), matchCauseEffect2({
      onSuccess: (response) => {
        span.attribute("http.response.status_code", response.status);
        const redactedHeaders2 = redact3(response.headers, redactedHeaderNames);
        for (const name in redactedHeaders2) {
          span.attribute(`http.response.header.${name}`, String(redactedHeaders2[name]));
        }
        if (scopedController)
          return succeed5(response);
        responseRegistry.register(response, controller);
        return succeed5(new InterruptibleResponse(response, controller));
      },
      onFailure(cause) {
        if (!scopedController && hasInterrupts2(cause)) {
          controller.abort();
        }
        return failCause3(cause);
      }
    })));
  });
})), succeed5);
var mapRequest = /* @__PURE__ */ dual(2, (self, f) => makeWith2(self.postprocess, (request3) => map5(self.preprocess(request3), f)));
var mapRequestEffect = /* @__PURE__ */ dual(2, (self, f) => makeWith2(self.postprocess, (request3) => flatMap2(self.preprocess(request3), f)));
var mapRequestInput = /* @__PURE__ */ dual(2, (self, f) => makeWith2(self.postprocess, (request3) => self.preprocess(f(request3))));
var mapRequestInputEffect = /* @__PURE__ */ dual(2, (self, f) => makeWith2(self.postprocess, (request3) => flatMap2(f(request3), self.preprocess)));
var retry4 = /* @__PURE__ */ dual(2, (self, policy) => transformResponse(self, retry2(policy)));
var retryTransient = /* @__PURE__ */ dual(2, (self, options3) => {
  const isOnlySchedule = isSchedule(options3);
  const retryOn = isOnlySchedule ? "errors-and-responses" : options3.retryOn ?? "errors-and-responses";
  const schedule3 = isOnlySchedule ? options3 : options3.schedule;
  const passthroughSchedule = schedule3 && passthrough(schedule3);
  const times2 = isOnlySchedule ? undefined : options3.times;
  return transformResponse(self, flow(retryOn === "errors-only" ? identity : repeat2({
    schedule: passthroughSchedule,
    times: times2,
    while: isTransientResponse
  }), retryOn === "response-only" ? identity : retry2({
    while: isOnlySchedule || options3.while === undefined ? isTransientError : or(isTransientError, options3.while),
    schedule: schedule3,
    times: times2
  })));
});
var withRateLimiter = /* @__PURE__ */ dual(2, (self, options3) => {
  const initialState = {
    initial: true,
    limit: options3.limit,
    window: max3(fromInputUnsafe(options3.window), millis(1))
  };
  const states = new Map;
  const keyOption = options3.key;
  const resolveKey = typeof keyOption === "function" ? keyOption : constant(keyOption);
  const tokensOption = options3.tokens;
  const resolveTokens = typeof tokensOption === "function" ? tokensOption : constant(tokensOption ?? 1);
  const getState = (key) => {
    const current = states.get(key);
    if (current !== undefined) {
      return current;
    }
    states.set(key, initialState);
    return initialState;
  };
  const onResponse = options3.disableResponseInspection ? undefined : (clock, key, headers, tokens) => {
    const current = getState(key);
    const next = parseRateLimiterState(current, clock, headers, tokens);
    if (next.limit !== current.limit || !equals2(next.window, current.window)) {
      states.set(key, next);
    }
  };
  return transform4(self, function loop(effect2, request3) {
    const fiber3 = getCurrent();
    const clock = fiber3.getRef(Clock);
    const key = resolveKey(request3);
    const tokens = Math.max(resolveTokens(request3), 1);
    const current = getState(key);
    function retry5(response) {
      if (options3.disableResponseInspection)
        return loop(effect2, request3);
      const retryAfter = parseRetryAfter(clock, getHeader(response.headers, "retry-after"));
      return retryAfter ? flatMap2(sleep2(retryAfter), () => loop(effect2, request3)) : loop(effect2, request3);
    }
    return flatMap2(options3.limiter.consume({
      algorithm: options3.algorithm,
      onExceeded: "delay",
      key,
      limit: current.limit,
      window: current.window,
      tokens
    }), ({
      delay: delay3
    }) => {
      const run2 = matchEffect3(effect2, {
        onSuccess(response) {
          onResponse?.(clock, key, response.headers, tokens);
          if (response.status !== 429)
            return succeed5(response);
          return retry5(response);
        },
        onFailure(error) {
          if (isTooManyRequestsHttpClientError(error)) {
            onResponse?.(clock, key, error.reason.response.headers, tokens);
            return retry5(error.reason.response);
          }
          return fail5(error);
        }
      });
      return isZero(delay3) ? run2 : delay2(run2, delay3);
    });
  });
});
var parseRateLimiterState = (state, clock, headers, tokens) => {
  const limit = parseRateLimitLimit(state, headers, tokens) ?? state.limit;
  const window = parseRateLimitWindow(clock, headers) ?? state.window;
  if (limit === state.limit && equals2(window, state.window)) {
    return state;
  }
  return {
    limit,
    window,
    initial: false
  };
};
var parseRateLimitLimit = (state, headers, tokens) => {
  const raw2 = getHeader(headers, "ratelimit-limit", "x-ratelimit-limit");
  const value2 = parseNumberHeader(raw2);
  if (value2 !== undefined && value2 > 0) {
    return value2;
  }
  const remaining = parseRateLimitRemaining(headers);
  if (remaining === undefined) {
    return;
  }
  return state.initial ? remaining + tokens : Math.max(remaining + tokens, state.limit);
};
var parseRateLimitRemaining = (headers) => {
  const raw2 = getHeader(headers, "ratelimit-remaining", "x-ratelimit-remaining");
  const value2 = parseNumberHeader(raw2);
  return value2 !== undefined && value2 >= 0 ? value2 : undefined;
};
var parseRateLimitWindow = (clock, headers) => {
  const retryAfter = parseRetryAfter(clock, getHeader(headers, "retry-after"));
  if (retryAfter !== undefined) {
    return retryAfter;
  }
  const resetAfter = parseResetAfter(getHeader(headers, "ratelimit-reset-after", "x-ratelimit-reset-after"));
  if (resetAfter !== undefined) {
    return resetAfter;
  }
  return parseResetHeader(clock, getHeader(headers, "ratelimit-reset", "x-ratelimit-reset"));
};
var parseRetryAfter = (clock, value2) => {
  if (value2 === undefined) {
    return;
  }
  const numeric = parseNumberHeader(value2);
  if (numeric !== undefined) {
    return max3(seconds(numeric), millis(1));
  }
  const parsedDate = Date.parse(value2);
  if (Number.isNaN(parsedDate)) {
    return;
  }
  const millis2 = parsedDate - clock.currentTimeMillisUnsafe();
  if (millis2 <= 0) {
    return millis(1);
  }
  return millis(millis2);
};
var parseResetAfter = (value2) => {
  const numeric = parseNumberHeader(value2);
  if (numeric === undefined || numeric <= 0) {
    return;
  }
  return max3(seconds(numeric), millis(1));
};
var parseResetHeader = (clock, value2) => {
  const numeric = parseNumberHeader(value2);
  if (numeric === undefined || numeric <= 0) {
    return;
  }
  const nowMillis = clock.currentTimeMillisUnsafe();
  if (numeric > 1000000000000) {
    return millis(Math.max(numeric - nowMillis, 1));
  }
  if (numeric > 1e9) {
    return millis(Math.max(numeric * 1000 - nowMillis, 1));
  }
  return max3(seconds(numeric), millis(1));
};
var parseNumberHeader = (value2) => {
  if (value2 === undefined) {
    return;
  }
  const match6 = /-?\d+(?:\.\d+)?/.exec(value2);
  if (match6 === null) {
    return;
  }
  const parsed = Number(match6[0]);
  return Number.isFinite(parsed) ? parsed : undefined;
};
var getHeader = (headers, ...keys2) => {
  for (let i = 0;i < keys2.length; i++) {
    const value2 = headers[keys2[i]];
    if (value2 !== undefined) {
      return value2;
    }
  }
  return;
};
var tap3 = /* @__PURE__ */ dual(2, (self, f) => transformResponse(self, tap2(f)));
var tapError4 = /* @__PURE__ */ dual(2, (self, f) => transformResponse(self, tapError2(f)));
var tapRequest = /* @__PURE__ */ dual(2, (self, f) => makeWith2(self.postprocess, (request3) => tap2(self.preprocess(request3), f)));
var withCookiesRef = /* @__PURE__ */ dual(2, (self, ref) => makeWith2((request3) => tap2(self.postprocess(request3), (response) => update2(ref, (cookies) => merge4(cookies, response.cookies))), (request3) => flatMap2(self.preprocess(request3), (request4) => map5(get2(ref), (cookies) => isEmpty(cookies) ? request4 : setHeader(request4, "cookie", toCookieHeader(cookies))))));
var withScope = (self) => transform4(self, (effect2, request3) => {
  const controller = new AbortController;
  scopedRequests.set(request3, controller);
  return andThen2(addFinalizer3(() => sync2(() => controller.abort())), effect2);
});
var followRedirects = /* @__PURE__ */ dual((args2) => isHttpClient(args2[0]), (self, maxRedirects) => makeWith2((request3) => {
  const loop = (request4, redirects) => flatMap2(self.postprocess(succeed5(request4)), (response) => response.status >= 300 && response.status < 400 && response.headers.location && redirects < (maxRedirects ?? 10) ? loop(setUrl(request4, new URL(response.headers.location, response.request.url)), redirects + 1) : succeed5(response));
  return flatMap2(request3, (request4) => loop(request4, 0));
}, self.preprocess));
var TracerDisabledWhen = /* @__PURE__ */ Reference("effect/http/HttpClient/TracerDisabledWhen", {
  defaultValue: () => constFalse
});
var TracerPropagationEnabled = /* @__PURE__ */ Reference("effect/HttpClient/TracerPropagationEnabled", {
  defaultValue: constTrue
});
var SpanNameGenerator = /* @__PURE__ */ Reference("effect/http/HttpClient/SpanNameGenerator", {
  defaultValue: () => (request3) => `http.client ${request3.method}`
});
var layerMergedContext = (effect2) => effect(HttpClient)(contextWith2((context3) => map5(effect2, (client) => transformResponse(client, updateContext2((input) => merge(context3, input))))));
var responseRegistry = /* @__PURE__ */ (() => {
  if ("FinalizationRegistry" in globalThis && globalThis.FinalizationRegistry) {
    const registry = /* @__PURE__ */ new FinalizationRegistry((controller) => {
      controller.abort();
    });
    return {
      register(response, controller) {
        registry.register(response, controller, response);
      },
      unregister(response) {
        registry.unregister(response);
      }
    };
  }
  const timers = /* @__PURE__ */ new Map;
  return {
    register(response, controller) {
      timers.set(response, setTimeout(() => controller.abort(), 5000));
    },
    unregister(response) {
      const timer = timers.get(response);
      if (timer === undefined)
        return;
      clearTimeout(timer);
      timers.delete(response);
    }
  };
})();
var scopedRequests = /* @__PURE__ */ new WeakMap;

class InterruptibleResponse {
  original;
  controller;
  constructor(original, controller) {
    this.original = original;
    this.controller = controller;
  }
  [TypeId29] = TypeId29;
  [TypeId28] = TypeId28;
  applyInterrupt(effect2) {
    return suspend2(() => {
      responseRegistry.unregister(this.original);
      return onInterrupt2(effect2, () => sync2(() => {
        this.controller.abort();
      }));
    });
  }
  get request() {
    return this.original.request;
  }
  get status() {
    return this.original.status;
  }
  get headers() {
    return this.original.headers;
  }
  get cookies() {
    return this.original.cookies;
  }
  get remoteAddress() {
    return this.original.remoteAddress;
  }
  get formData() {
    return this.applyInterrupt(this.original.formData);
  }
  get text() {
    return this.applyInterrupt(this.original.text);
  }
  get json() {
    return this.applyInterrupt(this.original.json);
  }
  get urlParamsBody() {
    return this.applyInterrupt(this.original.urlParamsBody);
  }
  get arrayBuffer() {
    return this.applyInterrupt(this.original.arrayBuffer);
  }
  get stream() {
    return suspend4(() => {
      responseRegistry.unregister(this.original);
      return ensuring4(this.original.stream, sync2(() => {
        this.controller.abort();
      }));
    });
  }
  toJSON() {
    return this.original.toJSON();
  }
  [NodeInspectSymbol]() {
    return this.original[NodeInspectSymbol]();
  }
  pipe() {
    return pipeArguments(this, arguments);
  }
}
var isTransientError = (error) => isTimeoutError2(error) || isTransientHttpError(error);
var isTransientHttpError = (error) => isHttpClientError(error) && (error.reason._tag === "TransportError" || error.reason._tag === "StatusCodeError" && isTransientResponse(error.reason.response));
var isTooManyRequestsHttpClientError = (error) => isHttpClientError(error) && error.reason._tag === "StatusCodeError" && error.reason.response.status === 429;
var isTransientResponse = (response) => response.status === 408 || response.status === 429 || response.status === 500 || response.status === 502 || response.status === 503 || response.status === 504;

// node_modules/effect/dist/unstable/http/FetchHttpClient.js
var Fetch = /* @__PURE__ */ Reference("effect/http/FetchHttpClient/Fetch", {
  defaultValue: () => globalThis.fetch
});

class RequestInit extends (/* @__PURE__ */ Service()("effect/http/FetchHttpClient/RequestInit")) {
}
var fetch = /* @__PURE__ */ make17((request3, url, signal, fiber3) => {
  const fetch2 = fiber3.getRef(Fetch);
  const options3 = fiber3.context.mapUnsafe.get(RequestInit.key) ?? {};
  let headers = options3.headers ? merge3(fromInput2(options3.headers), request3.headers) : request3.headers;
  if (headers["content-length"]) {
    headers = remove(headers, "content-length");
  }
  const send = (body) => map5(tryPromise2({
    try: () => fetch2(url, {
      ...options3,
      method: request3.method,
      headers,
      body,
      duplex: request3.body._tag === "Stream" ? "half" : undefined,
      signal
    }),
    catch: (cause) => new HttpClientError({
      reason: new TransportError({
        request: request3,
        cause
      })
    })
  }), (response) => fromWeb2(request3, response));
  switch (request3.body._tag) {
    case "Raw":
    case "Uint8Array":
      return send(request3.body.body);
    case "FormData":
      return send(request3.body.formData);
    case "Stream":
      return flatMap2(toReadableStreamEffect(request3.body.stream), send);
  }
  return send(undefined);
});
var layer = /* @__PURE__ */ layerMergedContext(/* @__PURE__ */ succeed5(fetch));
// src/search/aggregator.ts
var exports_aggregator = {};
__export(exports_aggregator, {
  normalizeUrl: () => normalizeUrl,
  formatStructuredReport: () => formatStructuredReport,
  formatResults: () => formatResults,
  formatEngineStatusReport: () => formatEngineStatusReport,
  calculateScore: () => calculateScore,
  aggregate: () => aggregate,
  Aggregator: () => exports_aggregator
});

// src/search/engine.ts
var exports_engine = {};
__export(exports_engine, {
  stripHtml: () => stripHtml,
  parseRelativeDate: () => parseRelativeDate,
  makeSearchResult: () => makeSearchResult,
  makeSearchOptions: () => makeSearchOptions,
  makeEngineStatus: () => makeEngineStatus,
  makeEngineMetrics: () => makeEngineMetrics,
  makeEngineConfig: () => makeEngineConfig,
  makeAggregatedResult: () => makeAggregatedResult,
  TimeoutError: () => TimeoutError2,
  SearchEngine: () => exports_engine,
  RateLimitError: () => RateLimitError,
  EngineError: () => EngineError,
  CaptchaError: () => CaptchaError,
  AccessDeniedError: () => AccessDeniedError
});
var REGEX_STRIP_TAGS = /<[^>]+>/g;
function stripHtml(text2) {
  return text2.replace(REGEX_STRIP_TAGS, "").replace(/"/g, '"').trim();
}
function makeSearchResult(data) {
  return { ...data };
}
function makeAggregatedResult(data) {
  return { ...data, score: data.score ?? 0 };
}
function makeEngineConfig(data) {
  return {
    name: data.name,
    weight: data.weight ?? 1,
    timeout: data.timeout ?? exports_Duration.toMillis(exports_Duration.seconds(15)),
    maxResults: data.maxResults ?? 50,
    requiresKey: data.requiresKey ?? false,
    priority: data.priority ?? 0
  };
}
function makeSearchOptions(data) {
  return {
    numResults: data?.numResults ?? 8,
    safesearch: data?.safesearch,
    timeRange: data?.timeRange,
    lang: data?.lang,
    livecrawl: data?.livecrawl
  };
}

class EngineError extends exports_Data.TaggedError("EngineError") {
}

class CaptchaError extends exports_Data.TaggedError("CaptchaError") {
}

class RateLimitError extends exports_Data.TaggedError("RateLimitError") {
}

class AccessDeniedError extends exports_Data.TaggedError("AccessDeniedError") {
}

class TimeoutError2 extends exports_Data.TaggedError("TimeoutError") {
}
function makeEngineMetrics() {
  return { totalRequests: 0, successfulRequests: 0, avgLatency: 0, totalLatency: 0 };
}
function parseRelativeDate(text2) {
  const now = Date.now();
  const t = text2.trim().toLowerCase();
  const isoMatch = t.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch)
    return new Date(`${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`).getTime();
  if (t === "today")
    return now;
  if (t === "yesterday")
    return now - 86400000;
  const lastMatch = t.match(/^last\s+(week|month|year)$/);
  if (lastMatch) {
    const unit = lastMatch[1];
    if (unit === "week")
      return now - 7 * 86400000;
    if (unit === "month")
      return now - 30 * 86400000;
    if (unit === "year")
      return now - 365 * 86400000;
  }
  const agoMatch = t.match(/^(\d+)\s*(minute|minutes|hour|hours|day|days|week|weeks|month|months|year|years)\s+ago$/);
  if (agoMatch) {
    const num = parseInt(agoMatch[1], 10);
    const unit = agoMatch[2];
    if (unit.startsWith("minute"))
      return now - num * 60000;
    if (unit.startsWith("hour"))
      return now - num * 3600000;
    if (unit.startsWith("day"))
      return now - num * 86400000;
    if (unit.startsWith("week"))
      return now - num * 7 * 86400000;
    if (unit.startsWith("month"))
      return now - num * 30 * 86400000;
    if (unit.startsWith("year"))
      return now - num * 365 * 86400000;
  }
  const shortMatch = t.match(/^(\d+)\s*(h|hr|d|w|mo|y)$/);
  if (shortMatch) {
    const num = parseInt(shortMatch[1], 10);
    const unit = shortMatch[2];
    if (unit === "h" || unit === "hr")
      return now - num * 3600000;
    if (unit === "d")
      return now - num * 86400000;
    if (unit === "w")
      return now - num * 7 * 86400000;
    if (unit === "mo")
      return now - num * 30 * 86400000;
    if (unit === "y")
      return now - num * 365 * 86400000;
  }
  return;
}
function makeEngineStatus() {
  return {
    consecutiveFailures: 0,
    totalFailures: 0,
    suspended: false,
    metrics: makeEngineMetrics()
  };
}

// src/search/aggregator.ts
function normalizeUrl(url) {
  try {
    const u = new URL(url);
    u.protocol = "https:";
    if (u.pathname.endsWith("/"))
      u.pathname = u.pathname.slice(0, -1);
    ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "ref", "source"].forEach((p) => u.searchParams.delete(p));
    u.searchParams.sort();
    return u.toString();
  } catch {
    return url;
  }
}
function levenshtein(a, b) {
  const m = a.length;
  const n = b.length;
  if (m === 0)
    return n;
  if (n === 0)
    return m;
  let prev = new Array(n + 1);
  let curr = new Array(n + 1);
  for (let j = 0;j <= n; j++)
    prev[j] = j;
  for (let i = 1;i <= m; i++) {
    curr[0] = i;
    for (let j = 1;j <= n; j++) {
      curr[j] = a[i - 1] === b[j - 1] ? prev[j - 1] : Math.min(prev[j], curr[j - 1], prev[j - 1]) + 1;
    }
    [prev, curr] = [curr, prev];
  }
  return prev[n];
}
function isSimilarTitle(a, b) {
  if (a === b)
    return true;
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0)
    return true;
  const minLen = Math.min(a.length, b.length);
  if (minLen > 0 && (maxLen - minLen) / maxLen > 0.3)
    return false;
  return levenshtein(a, b) / maxLen < 0.2;
}
function calculateScore(engines, positions, weights, publishedDate, title, snippet, query) {
  let score = 0;
  for (let i = 0;i < engines.length; i++) {
    score += (weights.get(engines[i]) ?? 1) / positions[i];
  }
  if (engines.length > 1)
    score *= 1 + (engines.length - 1) * 0.2;
  if (publishedDate) {
    const daysAgo = (Date.now() - publishedDate) / 86400000;
    const recencyFactor = Math.max(0.5, 1 - daysAgo / 365);
    score *= recencyFactor;
  }
  if (query && (title || snippet)) {
    const titleRel = title ? snippetRelevance(title, query) : 0;
    const snippetRel = snippet ? snippetRelevance(snippet, query) : 0;
    score += titleRel * 2 + snippetRel * 1;
  }
  return score;
}
function aggregate(allResults, ctx, query) {
  if (!ctx.suggestion) {
    for (const r of allResults) {
      if (r.suggestion) {
        ctx.suggestion = r.suggestion;
        break;
      }
    }
  }
  const urlMap = new Map;
  for (const r of allResults) {
    const key = normalizeUrl(r.url);
    const group = urlMap.get(key) ?? [];
    group.push(r);
    urlMap.set(key, group);
  }
  const mergedByUrl = [];
  for (const [, group] of urlMap)
    mergedByUrl.push(mergeGroup(group, query));
  const merged = [];
  const used = new Set;
  for (let i = 0;i < mergedByUrl.length; i++) {
    if (used.has(i))
      continue;
    used.add(i);
    const similarGroup = [mergedByUrl[i]];
    for (let j = i + 1;j < mergedByUrl.length; j++) {
      if (used.has(j))
        continue;
      if (isSimilarTitle(mergedByUrl[i].title, mergedByUrl[j].title)) {
        used.add(j);
        similarGroup.push(mergedByUrl[j]);
      }
    }
    merged.push(similarGroup.length === 1 ? similarGroup[0] : mergeSimilar(similarGroup));
  }
  for (const r of merged) {
    r.score = calculateScore(r.engines, r.positions, ctx.weights, r.publishedDate, r.title, r.snippet, query);
  }
  merged.sort((a, b) => b.score - a.score);
  return diversifyByDomain(merged, 3).slice(0, ctx.maxResults);
}
function snippetRelevance(snippet, query) {
  if (!query || !snippet)
    return 0;
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  const lower = snippet.toLowerCase();
  return terms.filter((t) => lower.includes(t)).length / terms.length;
}
function mergeGroup(group, query) {
  const first = group[0];
  const engines = [];
  const positions = [];
  let bestTitle = first.title;
  let bestSnippet = first.snippet;
  let bestDate = first.publishedDate;
  let suggestion;
  for (const r of group) {
    engines.push(r.engine);
    positions.push(r.position);
    if (r.title.length > bestTitle.length)
      bestTitle = r.title;
    const q = query ?? "";
    if (snippetRelevance(r.snippet, q) > snippetRelevance(bestSnippet, q) || snippetRelevance(r.snippet, q) === snippetRelevance(bestSnippet, q) && r.snippet.length > bestSnippet.length) {
      bestSnippet = r.snippet;
    }
    if (r.publishedDate && (!bestDate || r.publishedDate > bestDate))
      bestDate = r.publishedDate;
    if (r.suggestion && !suggestion)
      suggestion = r.suggestion;
  }
  return makeAggregatedResult({
    title: bestTitle,
    url: first.url,
    snippet: bestSnippet,
    engines,
    positions,
    publishedDate: bestDate,
    category: first.category,
    suggestion
  });
}
function mergeSimilar(group) {
  const first = group[0];
  const suggestion = group.find((r) => r.suggestion)?.suggestion;
  return makeAggregatedResult({
    title: first.title,
    url: first.url,
    snippet: group.reduce((best, r) => r.snippet.length > best.length ? r.snippet : best, first.snippet),
    engines: [...new Set(group.flatMap((r) => r.engines))],
    positions: group.flatMap((r) => r.positions),
    publishedDate: group.reduce((best, r) => r.publishedDate && (!best || r.publishedDate > best) ? r.publishedDate : best, first.publishedDate),
    category: first.category,
    suggestion
  });
}
function diversifyByDomain(results, maxPerDomain) {
  const domainCount = new Map;
  const diversified = [];
  const remaining = [];
  for (const r of results) {
    try {
      const domain = new URL(r.url).hostname.replace(/^www\./, "");
      const count = domainCount.get(domain) ?? 0;
      if (count < maxPerDomain) {
        domainCount.set(domain, count + 1);
        diversified.push(r);
      } else {
        remaining.push(r);
      }
    } catch {
      diversified.push(r);
    }
  }
  diversified.push(...remaining);
  return diversified;
}
function formatResults(results, query, ctxSuggestion) {
  if (results.length === 0)
    return "";
  function extractDomain(url) {
    try {
      return new URL(url).hostname.replace(/^www\./, "");
    } catch {
      return url;
    }
  }
  const lines = results.map((r, i) => {
    const meta = [`[${extractDomain(r.url)}]`];
    if (r.category)
      meta.push(r.category.toUpperCase());
    const sentiment = detectSentiment(r.title + " " + r.snippet);
    if (sentiment)
      meta.push(sentiment);
    const engineStr = r.engines.length === 1 ? r.engines[0] : `${r.engines[0]}+${r.engines.length - 1}更多`;
    return `${i + 1}. ${r.title}
` + `   ${meta.join(" · ")}
` + `   ${engineStr} | ${r.url}` + (r.publishedDate ? `
   日期: ${new Date(r.publishedDate).toISOString().slice(0, 10)}` : "") + `
   ${r.snippet ?? ""}`;
  });
  const parts2 = [
    `搜索 "${query}" 共 ${results.length} 条结果：`,
    ...lines
  ];
  const suggestion = results.find((r) => r.suggestion)?.suggestion ?? ctxSuggestion;
  if (suggestion) {
    parts2.push(`
您是不是想找: ${suggestion}`);
  }
  return parts2.join(`

`);
}
function formatStructuredReport(results, query) {
  if (results.length === 0)
    return "";
  function domain(url) {
    try {
      return new URL(url).hostname.replace(/^www\./, "");
    } catch {
      return url;
    }
  }
  const groups = new Map;
  for (const r of results) {
    const cat = r.category || "general";
    if (!groups.has(cat))
      groups.set(cat, { category: cat, sources: [], results: [] });
    const g = groups.get(cat);
    g.results.push(r);
    const d = domain(r.url);
    if (!g.sources.includes(d))
      g.sources.push(d);
  }
  const allSources = new Set(results.map((r) => domain(r.url)));
  const engineSet = new Set(results.flatMap((r) => r.engines));
  const topSource = [...allSources].slice(0, 5);
  const sentiments = results.map((r) => detectSentiment(r.title + " " + r.snippet));
  const positive = sentiments.filter((s) => s === "[正面]").length;
  const negative = sentiments.filter((s) => s === "[负面]").length;
  const neutral = sentiments.filter((s) => s === "[中性]").length;
  const sentimentSummary = positive + negative + neutral > 0 ? `${positive} 正面 · ${neutral} 中性 · ${negative} 负面` : "未检测到明显情感倾向";
  const sections = [];
  sections.push(`## 搜索结果分析报告: "${query}"
` + `
` + `**概览**: 共检索到 ${results.length} 条结果，来自 ${allSources.size} 个来源 ` + `（${engineSet.size} 个搜索引擎）。
` + `**主要来源**: ${topSource.join(", ")}。
` + `**覆盖类别**: ${[...groups.keys()].join(", ")}。
` + `**时效性**: ${getTimeliness(results)}。
` + `**情感倾向**: ${sentimentSummary}。`);
  let rank = 0;
  for (const [cat, group] of groups) {
    const label = CATEGORY_LABELS[cat] || cat;
    sections.push(`### ${label}（${group.results.length} 条）
` + `来源: ${group.sources.join(", ")}
` + group.results.slice(0, 5).map((r) => {
      rank++;
      return `${rank}. **${r.title}**
` + `   [${domain(r.url)}] | ${r.url}
` + (r.publishedDate ? `   日期: ${new Date(r.publishedDate).toISOString().slice(0, 10)}
` : "") + `   ${r.snippet || ""}`;
    }).join(`

`));
  }
  sections.push(`### 来源分析
` + `- **独立来源数**: ${allSources.size}
` + `- **搜索引擎数**: ${engineSet.size}
` + `- **最高分**: ${(results[0]?.score ?? 0).toFixed(1)}
` + `- **来源列表**: ${[...allSources].join(", ")}`);
  sections.push(`---
*报告由 opencode Search 生成 | ` + `共 ${results.length} 条结果 · ${allSources.size} 来源 · ` + `引擎: ${[...engineSet].join(", ")}*`);
  return sections.join(`

`);
}
var CATEGORY_LABELS = {
  general: "综合信息",
  video: "视频",
  image: "图片",
  music: "音乐",
  code: "代码/技术",
  academic: "学术",
  news: "新闻",
  social: "社交",
  shopping: "购物比价",
  encyclopedia: "百科"
};
function getTimeliness(results) {
  const dates = results.map((r) => r.publishedDate).filter((d) => d !== undefined);
  if (dates.length === 0)
    return "多数结果未标注日期";
  const now = Date.now();
  const oldest = Math.min(...dates);
  const newest = Math.max(...dates);
  const rangeDays = Math.round((now - oldest) / 86400000);
  const newestDays = Math.round((now - newest) / 86400000);
  if (newestDays <= 1)
    return "包含最新（1 天内）内容";
  if (newestDays <= 7)
    return "包含本周内容";
  if (rangeDays <= 30)
    return `近一月内的内容（最新 ${newestDays} 天前）`;
  return `内容时间跨度约 ${rangeDays} 天（最新 ${newestDays} 天前）`;
}
var POSITIVE_WORDS = /\b(excellent|amazing|great|wonderful| fantastic|beautiful|love|best|perfect|成功|优秀|出色|突破|创新|领先|好评)/i;
var NEGATIVE_WORDS = /\b(terrible|awful|horrible|worst|bad|hate|fail|error|crisis|惨淡|失败|崩盘|暴跌|争议|丑闻|批评|投诉|爆炸|死亡)/i;
var NEUTRAL_WORDS = /\b(分析|调查|报道|研究|report|analysis|survey|review|update|公告|声明|回应)/i;
function detectSentiment(text2) {
  if (POSITIVE_WORDS.test(text2))
    return "[正面]";
  if (NEGATIVE_WORDS.test(text2))
    return "[负面]";
  if (NEUTRAL_WORDS.test(text2))
    return "[中性]";
  return;
}
function formatEngineStatusReport(statuses) {
  const lines = ["引擎健康状态报告："];
  for (const [name, s] of statuses) {
    const latency = s.metrics.successfulRequests > 0 ? `${Math.round(s.metrics.avgLatency)}ms avg` : "no data";
    const successRate = s.metrics.totalRequests > 0 ? `${Math.round(s.metrics.successfulRequests / s.metrics.totalRequests * 100)}%` : "no data";
    lines.push(`  ${name}:` + ` ${s.suspended ? "\uD83D\uDD34暂停中" : "\uD83D\uDFE2正常"}` + ` 成功率=${successRate}` + ` 延迟=${latency}` + ` 连续失败=${s.consecutiveFailures}` + (s.lastError ? ` 上次错误="${s.lastError}"` : ""));
  }
  return lines.join(`
`);
}

// src/search/executor.ts
var exports_executor = {};
__export(exports_executor, {
  resetGlobalState: () => resetGlobalState,
  getGlobalState: () => getGlobalState,
  executeAll: () => executeAll,
  MAX_CONCURRENCY: () => MAX_CONCURRENCY,
  ExecutorState: () => ExecutorState,
  Executor: () => exports_executor
});

// src/search/rate-limiter.ts
var exports_rate_limiter = {};
__export(exports_rate_limiter, {
  waitForRateLimit: () => waitForRateLimit,
  randomUserAgent: () => randomUserAgent,
  getGlobalRateLimiter: () => getGlobalRateLimiter,
  RateLimiter: () => RateLimiter
});
var USER_AGENT_POOL = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:135.0) Gecko/20100101 Firefox/135.0",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:135.0) Gecko/20100101 Firefox/135.0",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15",
  "Mozilla/5.0 (Linux; Android 14; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Mobile Safari/537.36",
  "Mozilla/5.0 (Android 14; Mobile; rv:135.0) Gecko/135.0 Firefox/135.0"
];
function randomUserAgent() {
  return USER_AGENT_POOL[Math.floor(Math.random() * USER_AGENT_POOL.length)];
}

class RateLimiter {
  entries = new Map;
  defaultIntervalMs;
  engineIntervals = new Map;
  constructor(defaultIntervalMs = 800) {
    this.defaultIntervalMs = defaultIntervalMs;
  }
  setEngineInterval(engine, intervalMs) {
    this.engineIntervals.set(engine, intervalMs);
  }
  getInterval(engine) {
    return this.engineIntervals.get(engine) ?? this.defaultIntervalMs;
  }
  check(engine) {
    const now = Date.now();
    const entry = this.entries.get(engine);
    if (!entry) {
      this.entries.set(engine, { lastCallAt: now, consecutiveWaits: 0 });
      return 0;
    }
    const interval = this.getInterval(engine);
    const elapsed = now - entry.lastCallAt;
    if (elapsed >= interval) {
      entry.lastCallAt = now;
      entry.consecutiveWaits = 0;
      return 0;
    }
    const waitMs = interval - elapsed;
    entry.consecutiveWaits++;
    return Math.ceil(waitMs);
  }
  markCalled(engine) {
    const now = Date.now();
    const entry = this.entries.get(engine);
    if (entry) {
      entry.lastCallAt = now;
    } else {
      this.entries.set(engine, { lastCallAt: now, consecutiveWaits: 0 });
    }
  }
  getStatus() {
    const now = Date.now();
    const status = {};
    for (const [engine, entry] of this.entries) {
      status[engine] = {
        lastCallAgo: now - entry.lastCallAt,
        interval: this.getInterval(engine),
        waits: entry.consecutiveWaits
      };
    }
    return status;
  }
  reset() {
    this.entries.clear();
  }
}
var globalRateLimiter = new RateLimiter;
globalRateLimiter.setEngineInterval("google", 2000);
globalRateLimiter.setEngineInterval("google-images", 2000);
globalRateLimiter.setEngineInterval("google-news", 2000);
globalRateLimiter.setEngineInterval("google-scholar", 2000);
globalRateLimiter.setEngineInterval("baidu", 1500);
globalRateLimiter.setEngineInterval("sogou", 1500);
globalRateLimiter.setEngineInterval("naver", 1200);
globalRateLimiter.setEngineInterval("yandex", 1200);
globalRateLimiter.setEngineInterval("bing", 1000);
globalRateLimiter.setEngineInterval("bing-news", 1000);
globalRateLimiter.setEngineInterval("duckduckgo", 800);
globalRateLimiter.setEngineInterval("brave", 500);
function getGlobalRateLimiter() {
  return globalRateLimiter;
}
function waitForRateLimit(engine) {
  const limiter = getGlobalRateLimiter();
  const waitMs = limiter.check(engine);
  if (waitMs > 0) {}
  return waitMs;
}

// src/search/executor.ts
var MAX_CONCURRENCY = 10;

class ExecutorState {
  engineStatuses = new Map;
}
var globalEngineStatuses = new Map;
function getGlobalState() {
  return { engineStatuses: globalEngineStatuses };
}
function resetGlobalState() {
  globalEngineStatuses.clear();
}
function executeAll(engines, http, query, opts, state, onProgress) {
  return exports_Effect.gen(function* () {
    const active = engines.filter((e) => {
      const status = state.engineStatuses.get(e.name);
      if (!status?.suspended)
        return true;
      if (status.suspendedUntil && Date.now() > status.suspendedUntil) {
        status.suspended = false;
        status.consecutiveFailures = 0;
        return true;
      }
      return false;
    });
    if (active.length === 0)
      return { results: [], errors: [] };
    const total = active.length;
    const done4 = { value: 0 };
    const partialResults = { all: [] };
    const emitStart = (engineName) => {
      onProgress?.({
        done: done4.value,
        total,
        current: engineName,
        phase: "start",
        partialResults: partialResults.all,
        newResults: []
      });
    };
    const outcomes = yield* exports_Effect.forEach(active, (engine) => exports_Effect.gen(function* () {
      emitStart(engine.name);
      const outcome = yield* executeEngineSafely(engine, http, query, opts, state);
      if (outcome._tag === "success" && outcome.results.length > 0) {
        partialResults.all.push(...outcome.results);
        yield* onProgress?.({
          done: done4.value,
          total,
          current: engine.name,
          phase: "result",
          partialResults: partialResults.all,
          newResults: outcome.results
        }) ?? exports_Effect.void;
      }
      done4.value++;
      yield* onProgress?.({
        done: done4.value,
        total,
        current: engine.name,
        phase: "done",
        partialResults: partialResults.all,
        newResults: outcome._tag === "success" ? outcome.results : []
      }) ?? exports_Effect.void;
      return outcome;
    }), { concurrency: MAX_CONCURRENCY });
    const allResults = [];
    const allErrors = [];
    for (const o of outcomes) {
      if (o._tag === "success")
        allResults.push(...o.results);
      else
        allErrors.push(o.error);
    }
    return { results: allResults, errors: allErrors };
  });
}
function executeEngineSafely(engine, http, query, opts, state) {
  const startTime = Date.now();
  return exports_Effect.gen(function* () {
    const limiter = getGlobalRateLimiter();
    const waitMs = limiter.check(engine.name);
    if (waitMs > 0) {
      yield* exports_Effect.sleep(`${waitMs} millis`);
    }
    const maybeResults = yield* engine.search(http, query, opts).pipe(exports_Effect.timeout(engine.config.timeout));
    if (maybeResults === undefined) {
      throw new TimeoutError2({ engine: engine.name, message: `timed out after ${engine.config.timeout}ms` });
    }
    const results = maybeResults;
    const latency = Date.now() - startTime;
    const status = getOrCreateStatus(state, engine.name);
    status.consecutiveFailures = 0;
    status.metrics.totalRequests++;
    status.metrics.successfulRequests++;
    status.metrics.totalLatency += latency;
    status.metrics.avgLatency = status.metrics.totalLatency / status.metrics.successfulRequests;
    status.metrics.lastSuccessAt = Date.now();
    return { _tag: "success", results };
  }).pipe(exports_Effect.catch((error) => {
    const latency = Date.now() - startTime;
    if (error instanceof RateLimitError) {
      const status2 = getOrCreateStatus(state, engine.name);
      status2.lastError = error.message;
      status2.metrics.totalRequests++;
      const retryAfter = error.retryAfter ?? 60;
      status2.suspended = true;
      status2.suspendedUntil = Date.now() + retryAfter * 1000;
      status2.lastSuspensionReason = `rate-limited, retry-after: ${retryAfter}s`;
      status2.lastSuspensionDuration = retryAfter * 1000;
      return exports_Effect.succeed({
        _tag: "error",
        error: new EngineError({ engine: engine.name, message: error.message, retryable: true })
      });
    }
    if (error instanceof CaptchaError || error instanceof AccessDeniedError) {
      const status2 = getOrCreateStatus(state, engine.name);
      status2.lastError = error.message;
      status2.metrics.totalRequests++;
      status2.consecutiveFailures++;
      status2.suspended = true;
      status2.suspendedUntil = Date.now() + exports_Duration.toMillis(exports_Duration.minutes(30));
      status2.lastSuspensionReason = error instanceof CaptchaError ? "captcha-challenge" : "access-denied";
      status2.lastSuspensionDuration = exports_Duration.toMillis(exports_Duration.minutes(30));
      return exports_Effect.succeed({
        _tag: "error",
        error: new EngineError({ engine: engine.name, message: error.message, retryable: false })
      });
    }
    if (error instanceof TimeoutError2) {
      const status2 = getOrCreateStatus(state, engine.name);
      status2.metrics.totalRequests++;
      applyExponentialBackoff(status2, engine.name, `timeout after ${engine.config.timeout}ms`);
      return exports_Effect.succeed({
        _tag: "error",
        error: new EngineError({ engine: engine.name, message: `timeout: ${error.message}`, retryable: true })
      });
    }
    const msg = error instanceof Error ? error.message : String(error);
    const status = getOrCreateStatus(state, engine.name);
    status.metrics.totalRequests++;
    applyExponentialBackoff(status, engine.name, msg);
    return exports_Effect.succeed({
      _tag: "error",
      error: new EngineError({ engine: engine.name, message: msg, retryable: true })
    });
  }), exports_Effect.catchDefect((defect) => {
    const engineErr = new EngineError({ engine: engine.name, message: String(defect), retryable: false });
    const status = getOrCreateStatus(state, engine.name);
    status.metrics.totalRequests++;
    applyExponentialBackoff(status, engine.name, `defect: ${String(defect)}`);
    return exports_Effect.succeed({ _tag: "error", error: engineErr });
  }));
}
function applyExponentialBackoff(status, engineName, errorMessage) {
  status.consecutiveFailures++;
  status.totalFailures++;
  status.lastError = errorMessage;
  const baseMinutes = status.consecutiveFailures <= 1 ? 1 : status.consecutiveFailures <= 2 ? 5 : 15;
  const jitter = 0.8 + Math.random() * 0.4;
  const backoffMinutes = baseMinutes * jitter;
  const clamped = Math.min(backoffMinutes, 60);
  const durationMs = clamped * 60 * 1000;
  status.suspended = true;
  status.suspendedUntil = Date.now() + durationMs;
  status.lastSuspensionReason = `exponential-backoff@${baseMinutes}min(jitter=${jitter.toFixed(2)})`;
  status.lastSuspensionDuration = durationMs;
}
function getOrCreateStatus(state, name) {
  let status = state.engineStatuses.get(name);
  if (!status) {
    status = makeEngineStatus();
    state.engineStatuses.set(name, status);
  }
  return status;
}

// src/search/selector.ts
var exports_selector = {};
__export(exports_selector, {
  selectEngines: () => selectEngines,
  engineSummary: () => engineSummary,
  Selector: () => exports_selector
});

// node_modules/entities/lib/esm/generated/decode-data-html.js
var decode_data_html_default = new Uint16Array("ᵁ<Õıʊҝջאٵ۞ޢߖࠏ੊ઑඡ๭༉༦჊ረዡᐕᒝᓃᓟᔥ\x00\x00\x00\x00\x00\x00ᕫᛍᦍᰒᷝ὾⁠↰⊍⏀⏻⑂⠤⤒ⴈ⹈⿎〖㊺㘹㞬㣾㨨㩱㫠㬮ࠀEMabcfglmnoprstu\\bfms¦³¹ÈÏlig耻Æ䃆P耻&䀦cute耻Á䃁reve;䄂Āiyx}rc耻Â䃂;䐐r;쀀\uD835\uDD04rave耻À䃀pha;䎑acr;䄀d;橓Āgp¡on;䄄f;쀀\uD835\uDD38plyFunction;恡ing耻Å䃅Ācs¾Ãr;쀀\uD835\uDC9Cign;扔ilde耻Ã䃃ml耻Ä䃄ЀaceforsuåûþėĜĢħĪĀcrêòkslash;或Ŷöø;櫧ed;挆y;䐑ƀcrtąċĔause;戵noullis;愬a;䎒r;쀀\uD835\uDD05pf;쀀\uD835\uDD39eve;䋘còēmpeq;扎܀HOacdefhilorsuōőŖƀƞƢƵƷƺǜȕɳɸɾcy;䐧PY耻©䂩ƀcpyŝŢźute;䄆Ā;iŧŨ拒talDifferentialD;慅leys;愭ȀaeioƉƎƔƘron;䄌dil耻Ç䃇rc;䄈nint;戰ot;䄊ĀdnƧƭilla;䂸terDot;䂷òſi;䎧rcleȀDMPTǇǋǑǖot;抙inus;抖lus;投imes;抗oĀcsǢǸkwiseContourIntegral;戲eCurlyĀDQȃȏoubleQuote;思uote;怙ȀlnpuȞȨɇɕonĀ;eȥȦ户;橴ƀgitȯȶȺruent;扡nt;戯ourIntegral;戮ĀfrɌɎ;愂oduct;成nterClockwiseContourIntegral;戳oss;樯cr;쀀\uD835\uDC9EpĀ;Cʄʅ拓ap;才րDJSZacefiosʠʬʰʴʸˋ˗ˡ˦̳ҍĀ;oŹʥtrahd;椑cy;䐂cy;䐅cy;䐏ƀgrsʿ˄ˇger;怡r;憡hv;櫤Āayː˕ron;䄎;䐔lĀ;t˝˞戇a;䎔r;쀀\uD835\uDD07Āaf˫̧Ācm˰̢riticalȀADGT̖̜̀̆cute;䂴oŴ̋̍;䋙bleAcute;䋝rave;䁠ilde;䋜ond;拄ferentialD;慆Ѱ̽\x00\x00\x00͔͂\x00Ѕf;쀀\uD835\uDD3Bƀ;DE͈͉͍䂨ot;惜qual;扐blèCDLRUVͣͲ΂ϏϢϸontourIntegraìȹoɴ͹\x00\x00ͻ»͉nArrow;懓Āeo·ΤftƀARTΐΖΡrrow;懐ightArrow;懔eåˊngĀLRΫτeftĀARγιrrow;柸ightArrow;柺ightArrow;柹ightĀATϘϞrrow;懒ee;抨pɁϩ\x00\x00ϯrrow;懑ownArrow;懕erticalBar;戥ǹABLRTaВЪаўѿͼrrowƀ;BUНОТ憓ar;椓pArrow;懵reve;䌑eft˒к\x00ц\x00ѐightVector;楐eeVector;楞ectorĀ;Bљњ憽ar;楖ightǔѧ\x00ѱeeVector;楟ectorĀ;BѺѻ懁ar;楗eeĀ;A҆҇护rrow;憧ĀctҒҗr;쀀\uD835\uDC9Frok;䄐ࠀNTacdfglmopqstuxҽӀӄӋӞӢӧӮӵԡԯԶՒ՝ՠեG;䅊H耻Ð䃐cute耻É䃉ƀaiyӒӗӜron;䄚rc耻Ê䃊;䐭ot;䄖r;쀀\uD835\uDD08rave耻È䃈ement;戈ĀapӺӾcr;䄒tyɓԆ\x00\x00ԒmallSquare;旻erySmallSquare;斫ĀgpԦԪon;䄘f;쀀\uD835\uDD3Csilon;䎕uĀaiԼՉlĀ;TՂՃ橵ilde;扂librium;懌Āci՗՚r;愰m;橳a;䎗ml耻Ë䃋Āipժկsts;戃onentialE;慇ʀcfiosօֈ֍ֲ׌y;䐤r;쀀\uD835\uDD09lledɓ֗\x00\x00֣mallSquare;旼erySmallSquare;斪Ͱֺ\x00ֿ\x00\x00ׄf;쀀\uD835\uDD3DAll;戀riertrf;愱cò׋؀JTabcdfgorstר׬ׯ׺؀ؒؖ؛؝أ٬ٲcy;䐃耻>䀾mmaĀ;d׷׸䎓;䏜reve;䄞ƀeiy؇،ؐdil;䄢rc;䄜;䐓ot;䄠r;쀀\uD835\uDD0A;拙pf;쀀\uD835\uDD3Eeater̀EFGLSTصلَٖٛ٦qualĀ;Lؾؿ扥ess;招ullEqual;执reater;檢ess;扷lantEqual;橾ilde;扳cr;쀀\uD835\uDCA2;扫ЀAacfiosuڅڋږڛڞڪھۊRDcy;䐪Āctڐڔek;䋇;䁞irc;䄤r;愌lbertSpace;愋ǰگ\x00ڲf;愍izontalLine;攀Āctۃۅòکrok;䄦mpńېۘownHumðįqual;扏܀EJOacdfgmnostuۺ۾܃܇܎ܚܞܡܨ݄ݸދޏޕcy;䐕lig;䄲cy;䐁cute耻Í䃍Āiyܓܘrc耻Î䃎;䐘ot;䄰r;愑rave耻Ì䃌ƀ;apܠܯܿĀcgܴܷr;䄪inaryI;慈lieóϝǴ݉\x00ݢĀ;eݍݎ戬Āgrݓݘral;戫section;拂isibleĀCTݬݲomma;恣imes;恢ƀgptݿރވon;䄮f;쀀\uD835\uDD40a;䎙cr;愐ilde;䄨ǫޚ\x00ޞcy;䐆l耻Ï䃏ʀcfosuެ޷޼߂ߐĀiyޱ޵rc;䄴;䐙r;쀀\uD835\uDD0Dpf;쀀\uD835\uDD41ǣ߇\x00ߌr;쀀\uD835\uDCA5rcy;䐈kcy;䐄΀HJacfosߤߨ߽߬߱ࠂࠈcy;䐥cy;䐌ppa;䎚Āey߶߻dil;䄶;䐚r;쀀\uD835\uDD0Epf;쀀\uD835\uDD42cr;쀀\uD835\uDCA6րJTaceflmostࠥࠩࠬࡐࡣ঳সে্਷ੇcy;䐉耻<䀼ʀcmnpr࠷࠼ࡁࡄࡍute;䄹bda;䎛g;柪lacetrf;愒r;憞ƀaeyࡗ࡜ࡡron;䄽dil;䄻;䐛Āfsࡨ॰tԀACDFRTUVarࡾࢩࢱࣦ࣠ࣼयज़ΐ४Ānrࢃ࢏gleBracket;柨rowƀ;BR࢙࢚࢞憐ar;懤ightArrow;懆eiling;挈oǵࢷ\x00ࣃbleBracket;柦nǔࣈ\x00࣒eeVector;楡ectorĀ;Bࣛࣜ懃ar;楙loor;挊ightĀAV࣯ࣵrrow;憔ector;楎Āerँगeƀ;AVउऊऐ抣rrow;憤ector;楚iangleƀ;BEतथऩ抲ar;槏qual;抴pƀDTVषूौownVector;楑eeVector;楠ectorĀ;Bॖॗ憿ar;楘ectorĀ;B॥०憼ar;楒ightáΜs̀EFGLSTॾঋকঝঢভqualGreater;拚ullEqual;扦reater;扶ess;檡lantEqual;橽ilde;扲r;쀀\uD835\uDD0FĀ;eঽা拘ftarrow;懚idot;䄿ƀnpw৔ਖਛgȀLRlr৞৷ਂਐeftĀAR০৬rrow;柵ightArrow;柷ightArrow;柶eftĀarγਊightáοightáϊf;쀀\uD835\uDD43erĀLRਢਬeftArrow;憙ightArrow;憘ƀchtਾੀੂòࡌ;憰rok;䅁;扪Ѐacefiosuਗ਼੝੠੷੼અઋ઎p;椅y;䐜Ādl੥੯iumSpace;恟lintrf;愳r;쀀\uD835\uDD10nusPlus;戓pf;쀀\uD835\uDD44cò੶;䎜ҀJacefostuણધભીଔଙඑ඗ඞcy;䐊cute;䅃ƀaey઴હાron;䅇dil;䅅;䐝ƀgswે૰଎ativeƀMTV૓૟૨ediumSpace;怋hiĀcn૦૘ë૙eryThiî૙tedĀGL૸ଆreaterGreateòٳessLesóੈLine;䀊r;쀀\uD835\uDD11ȀBnptଢନଷ଺reak;恠BreakingSpace;䂠f;愕ڀ;CDEGHLNPRSTV୕ୖ୪୼஡௫ఄ౞಄ದ೘ൡඅ櫬Āou୛୤ngruent;扢pCap;扭oubleVerticalBar;戦ƀlqxஃஊ஛ement;戉ualĀ;Tஒஓ扠ilde;쀀≂̸ists;戄reater΀;EFGLSTஶஷ஽௉௓௘௥扯qual;扱ullEqual;쀀≧̸reater;쀀≫̸ess;批lantEqual;쀀⩾̸ilde;扵umpń௲௽ownHump;쀀≎̸qual;쀀≏̸eĀfsఊధtTriangleƀ;BEచఛడ拪ar;쀀⧏̸qual;括s̀;EGLSTవశ఼ౄోౘ扮qual;扰reater;扸ess;쀀≪̸lantEqual;쀀⩽̸ilde;扴estedĀGL౨౹reaterGreater;쀀⪢̸essLess;쀀⪡̸recedesƀ;ESಒಓಛ技qual;쀀⪯̸lantEqual;拠ĀeiಫಹverseElement;戌ghtTriangleƀ;BEೋೌ೒拫ar;쀀⧐̸qual;拭ĀquೝഌuareSuĀbp೨೹setĀ;E೰ೳ쀀⊏̸qual;拢ersetĀ;Eഃആ쀀⊐̸qual;拣ƀbcpഓതൎsetĀ;Eഛഞ쀀⊂⃒qual;抈ceedsȀ;ESTലള഻െ抁qual;쀀⪰̸lantEqual;拡ilde;쀀≿̸ersetĀ;E൘൛쀀⊃⃒qual;抉ildeȀ;EFT൮൯൵ൿ扁qual;扄ullEqual;扇ilde;扉erticalBar;戤cr;쀀\uD835\uDCA9ilde耻Ñ䃑;䎝܀Eacdfgmoprstuvලෂ෉෕ෛ෠෧෼ขภยา฿ไlig;䅒cute耻Ó䃓Āiy෎ීrc耻Ô䃔;䐞blac;䅐r;쀀\uD835\uDD12rave耻Ò䃒ƀaei෮ෲ෶cr;䅌ga;䎩cron;䎟pf;쀀\uD835\uDD46enCurlyĀDQฎบoubleQuote;怜uote;怘;橔Āclวฬr;쀀\uD835\uDCAAash耻Ø䃘iŬื฼de耻Õ䃕es;樷ml耻Ö䃖erĀBP๋๠Āar๐๓r;怾acĀek๚๜;揞et;掴arenthesis;揜Ҁacfhilors๿ງຊຏຒດຝະ໼rtialD;戂y;䐟r;쀀\uD835\uDD13i;䎦;䎠usMinus;䂱Āipຢອncareplanåڝf;愙Ȁ;eio຺ູ໠໤檻cedesȀ;EST່້໏໚扺qual;檯lantEqual;扼ilde;找me;怳Ādp໩໮uct;戏ortionĀ;aȥ໹l;戝Āci༁༆r;쀀\uD835\uDCAB;䎨ȀUfos༑༖༛༟OT耻\"䀢r;쀀\uD835\uDD14pf;愚cr;쀀\uD835\uDCAC؀BEacefhiorsu༾གྷཇའཱིྦྷྪྭ႖ႩႴႾarr;椐G耻®䂮ƀcnrཎནབute;䅔g;柫rĀ;tཛྷཝ憠l;椖ƀaeyཧཬཱron;䅘dil;䅖;䐠Ā;vླྀཹ愜erseĀEUྂྙĀlq྇ྎement;戋uilibrium;懋pEquilibrium;楯r»ཹo;䎡ghtЀACDFTUVa࿁࿫࿳ဢဨၛႇϘĀnr࿆࿒gleBracket;柩rowƀ;BL࿜࿝࿡憒ar;懥eftArrow;懄eiling;按oǵ࿹\x00စbleBracket;柧nǔည\x00နeeVector;楝ectorĀ;Bဝသ懂ar;楕loor;挋Āerိ၃eƀ;AVဵံြ抢rrow;憦ector;楛iangleƀ;BEၐၑၕ抳ar;槐qual;抵pƀDTVၣၮၸownVector;楏eeVector;楜ectorĀ;Bႂႃ憾ar;楔ectorĀ;B႑႒懀ar;楓Āpuႛ႞f;愝ndImplies;楰ightarrow;懛ĀchႹႼr;愛;憱leDelayed;槴ڀHOacfhimoqstuფჱჷჽᄙᄞᅑᅖᅡᅧᆵᆻᆿĀCcჩხHcy;䐩y;䐨FTcy;䐬cute;䅚ʀ;aeiyᄈᄉᄎᄓᄗ檼ron;䅠dil;䅞rc;䅜;䐡r;쀀\uD835\uDD16ortȀDLRUᄪᄴᄾᅉownArrow»ОeftArrow»࢚ightArrow»࿝pArrow;憑gma;䎣allCircle;战pf;쀀\uD835\uDD4Aɲᅭ\x00\x00ᅰt;戚areȀ;ISUᅻᅼᆉᆯ斡ntersection;抓uĀbpᆏᆞsetĀ;Eᆗᆘ抏qual;抑ersetĀ;Eᆨᆩ抐qual;抒nion;抔cr;쀀\uD835\uDCAEar;拆ȀbcmpᇈᇛሉላĀ;sᇍᇎ拐etĀ;Eᇍᇕqual;抆ĀchᇠህeedsȀ;ESTᇭᇮᇴᇿ扻qual;檰lantEqual;扽ilde;承Tháྌ;我ƀ;esሒሓሣ拑rsetĀ;Eሜም抃qual;抇et»ሓրHRSacfhiorsሾቄ቉ቕ቞ቱቶኟዂወዑORN耻Þ䃞ADE;愢ĀHc቎ቒcy;䐋y;䐦Ābuቚቜ;䀉;䎤ƀaeyብቪቯron;䅤dil;䅢;䐢r;쀀\uD835\uDD17Āeiቻ኉ǲኀ\x00ኇefore;戴a;䎘Ācn኎ኘkSpace;쀀  Space;怉ldeȀ;EFTካኬኲኼ戼qual;扃ullEqual;扅ilde;扈pf;쀀\uD835\uDD4BipleDot;惛Āctዖዛr;쀀\uD835\uDCAFrok;䅦ૡዷጎጚጦ\x00ጬጱ\x00\x00\x00\x00\x00ጸጽ፷ᎅ\x00᏿ᐄᐊᐐĀcrዻጁute耻Ú䃚rĀ;oጇገ憟cir;楉rǣጓ\x00጖y;䐎ve;䅬Āiyጞጣrc耻Û䃛;䐣blac;䅰r;쀀\uD835\uDD18rave耻Ù䃙acr;䅪Ādiፁ፩erĀBPፈ፝Āarፍፐr;䁟acĀekፗፙ;揟et;掵arenthesis;揝onĀ;P፰፱拃lus;抎Āgp፻፿on;䅲f;쀀\uD835\uDD4CЀADETadps᎕ᎮᎸᏄϨᏒᏗᏳrrowƀ;BDᅐᎠᎤar;椒ownArrow;懅ownArrow;憕quilibrium;楮eeĀ;AᏋᏌ报rrow;憥ownáϳerĀLRᏞᏨeftArrow;憖ightArrow;憗iĀ;lᏹᏺ䏒on;䎥ing;䅮cr;쀀\uD835\uDCB0ilde;䅨ml耻Ü䃜ҀDbcdefosvᐧᐬᐰᐳᐾᒅᒊᒐᒖash;披ar;櫫y;䐒ashĀ;lᐻᐼ抩;櫦Āerᑃᑅ;拁ƀbtyᑌᑐᑺar;怖Ā;iᑏᑕcalȀBLSTᑡᑥᑪᑴar;戣ine;䁼eparator;杘ilde;所ThinSpace;怊r;쀀\uD835\uDD19pf;쀀\uD835\uDD4Dcr;쀀\uD835\uDCB1dash;抪ʀcefosᒧᒬᒱᒶᒼirc;䅴dge;拀r;쀀\uD835\uDD1Apf;쀀\uD835\uDD4Ecr;쀀\uD835\uDCB2Ȁfiosᓋᓐᓒᓘr;쀀\uD835\uDD1B;䎞pf;쀀\uD835\uDD4Fcr;쀀\uD835\uDCB3ҀAIUacfosuᓱᓵᓹᓽᔄᔏᔔᔚᔠcy;䐯cy;䐇cy;䐮cute耻Ý䃝Āiyᔉᔍrc;䅶;䐫r;쀀\uD835\uDD1Cpf;쀀\uD835\uDD50cr;쀀\uD835\uDCB4ml;䅸ЀHacdefosᔵᔹᔿᕋᕏᕝᕠᕤcy;䐖cute;䅹Āayᕄᕉron;䅽;䐗ot;䅻ǲᕔ\x00ᕛoWidtè૙a;䎖r;愨pf;愤cr;쀀\uD835\uDCB5௡ᖃᖊᖐ\x00ᖰᖶᖿ\x00\x00\x00\x00ᗆᗛᗫᙟ᙭\x00ᚕ᚛ᚲᚹ\x00ᚾcute耻á䃡reve;䄃̀;Ediuyᖜᖝᖡᖣᖨᖭ戾;쀀∾̳;房rc耻â䃢te肻´̆;䐰lig耻æ䃦Ā;r²ᖺ;쀀\uD835\uDD1Erave耻à䃠ĀepᗊᗖĀfpᗏᗔsym;愵èᗓha;䎱ĀapᗟcĀclᗤᗧr;䄁g;樿ɤᗰ\x00\x00ᘊʀ;adsvᗺᗻᗿᘁᘇ戧nd;橕;橜lope;橘;橚΀;elmrszᘘᘙᘛᘞᘿᙏᙙ戠;榤e»ᘙsdĀ;aᘥᘦ戡ѡᘰᘲᘴᘶᘸᘺᘼᘾ;榨;榩;榪;榫;榬;榭;榮;榯tĀ;vᙅᙆ戟bĀ;dᙌᙍ抾;榝Āptᙔᙗh;戢»¹arr;捼Āgpᙣᙧon;䄅f;쀀\uD835\uDD52΀;Eaeiop዁ᙻᙽᚂᚄᚇᚊ;橰cir;橯;扊d;手s;䀧roxĀ;e዁ᚒñᚃing耻å䃥ƀctyᚡᚦᚨr;쀀\uD835\uDCB6;䀪mpĀ;e዁ᚯñʈilde耻ã䃣ml耻ä䃤Āciᛂᛈoninôɲnt;樑ࠀNabcdefiklnoprsu᛭ᛱᜰ᜼ᝃᝈ᝸᝽០៦ᠹᡐᜍ᤽᥈ᥰot;櫭Ācrᛶ᜞kȀcepsᜀᜅᜍᜓong;扌psilon;䏶rime;怵imĀ;e᜚᜛戽q;拍Ŷᜢᜦee;抽edĀ;gᜬᜭ挅e»ᜭrkĀ;t፜᜷brk;掶Āoyᜁᝁ;䐱quo;怞ʀcmprtᝓ᝛ᝡᝤᝨausĀ;eĊĉptyv;榰séᜌnoõēƀahwᝯ᝱ᝳ;䎲;愶een;扬r;쀀\uD835\uDD1Fg΀costuvwឍឝឳេ៕៛៞ƀaiuបពរðݠrc;旯p»፱ƀdptឤឨឭot;樀lus;樁imes;樂ɱឹ\x00\x00ើcup;樆ar;昅riangleĀdu៍្own;施p;斳plus;樄eåᑄåᒭarow;植ƀako៭ᠦᠵĀcn៲ᠣkƀlst៺֫᠂ozenge;槫riangleȀ;dlr᠒᠓᠘᠝斴own;斾eft;旂ight;斸k;搣Ʊᠫ\x00ᠳƲᠯ\x00ᠱ;斒;斑4;斓ck;斈ĀeoᠾᡍĀ;qᡃᡆ쀀=⃥uiv;쀀≡⃥t;挐Ȁptwxᡙᡞᡧᡬf;쀀\uD835\uDD53Ā;tᏋᡣom»Ꮜtie;拈؀DHUVbdhmptuvᢅᢖᢪᢻᣗᣛᣬ᣿ᤅᤊᤐᤡȀLRlrᢎᢐᢒᢔ;敗;敔;敖;敓ʀ;DUduᢡᢢᢤᢦᢨ敐;敦;敩;敤;敧ȀLRlrᢳᢵᢷᢹ;敝;敚;敜;教΀;HLRhlrᣊᣋᣍᣏᣑᣓᣕ救;敬;散;敠;敫;敢;敟ox;槉ȀLRlrᣤᣦᣨᣪ;敕;敒;攐;攌ʀ;DUduڽ᣷᣹᣻᣽;敥;敨;攬;攴inus;抟lus;択imes;抠ȀLRlrᤙᤛᤝ᤟;敛;敘;攘;攔΀;HLRhlrᤰᤱᤳᤵᤷ᤻᤹攂;敪;敡;敞;攼;攤;攜Āevģ᥂bar耻¦䂦Ȁceioᥑᥖᥚᥠr;쀀\uD835\uDCB7mi;恏mĀ;e᜚᜜lƀ;bhᥨᥩᥫ䁜;槅sub;柈Ŭᥴ᥾lĀ;e᥹᥺怢t»᥺pƀ;Eeįᦅᦇ;檮Ā;qۜۛೡᦧ\x00᧨ᨑᨕᨲ\x00ᨷᩐ\x00\x00᪴\x00\x00᫁\x00\x00ᬡᬮ᭍᭒\x00᯽\x00ᰌƀcpr᦭ᦲ᧝ute;䄇̀;abcdsᦿᧀᧄ᧊᧕᧙戩nd;橄rcup;橉Āau᧏᧒p;橋p;橇ot;橀;쀀∩︀Āeo᧢᧥t;恁îړȀaeiu᧰᧻ᨁᨅǰ᧵\x00᧸s;橍on;䄍dil耻ç䃧rc;䄉psĀ;sᨌᨍ橌m;橐ot;䄋ƀdmnᨛᨠᨦil肻¸ƭptyv;榲t脀¢;eᨭᨮ䂢räƲr;쀀\uD835\uDD20ƀceiᨽᩀᩍy;䑇ckĀ;mᩇᩈ朓ark»ᩈ;䏇r΀;Ecefms᩟᩠ᩢᩫ᪤᪪᪮旋;槃ƀ;elᩩᩪᩭ䋆q;扗eɡᩴ\x00\x00᪈rrowĀlr᩼᪁eft;憺ight;憻ʀRSacd᪒᪔᪖᪚᪟»ཇ;擈st;抛irc;抚ash;抝nint;樐id;櫯cir;槂ubsĀ;u᪻᪼晣it»᪼ˬ᫇᫔᫺\x00ᬊonĀ;eᫍᫎ䀺Ā;qÇÆɭ᫙\x00\x00᫢aĀ;t᫞᫟䀬;䁀ƀ;fl᫨᫩᫫戁îᅠeĀmx᫱᫶ent»᫩eóɍǧ᫾\x00ᬇĀ;dኻᬂot;橭nôɆƀfryᬐᬔᬗ;쀀\uD835\uDD54oäɔ脀©;sŕᬝr;愗Āaoᬥᬩrr;憵ss;朗Ācuᬲᬷr;쀀\uD835\uDCB8Ābpᬼ᭄Ā;eᭁᭂ櫏;櫑Ā;eᭉᭊ櫐;櫒dot;拯΀delprvw᭠᭬᭷ᮂᮬᯔ᯹arrĀlr᭨᭪;椸;椵ɰ᭲\x00\x00᭵r;拞c;拟arrĀ;p᭿ᮀ憶;椽̀;bcdosᮏᮐᮖᮡᮥᮨ截rcap;橈Āauᮛᮞp;橆p;橊ot;抍r;橅;쀀∪︀Ȁalrv᮵ᮿᯞᯣrrĀ;mᮼᮽ憷;椼yƀevwᯇᯔᯘqɰᯎ\x00\x00ᯒreã᭳uã᭵ee;拎edge;拏en耻¤䂤earrowĀlrᯮ᯳eft»ᮀight»ᮽeäᯝĀciᰁᰇoninôǷnt;戱lcty;挭ঀAHabcdefhijlorstuwz᰸᰻᰿ᱝᱩᱵᲊᲞᲬᲷ᳻᳿ᴍᵻᶑᶫᶻ᷆᷍rò΁ar;楥Ȁglrs᱈ᱍ᱒᱔ger;怠eth;愸òᄳhĀ;vᱚᱛ怐»ऊūᱡᱧarow;椏aã̕Āayᱮᱳron;䄏;䐴ƀ;ao̲ᱼᲄĀgrʿᲁr;懊tseq;橷ƀglmᲑᲔᲘ耻°䂰ta;䎴ptyv;榱ĀirᲣᲨsht;楿;쀀\uD835\uDD21arĀlrᲳᲵ»ࣜ»သʀaegsv᳂͸᳖᳜᳠mƀ;oș᳊᳔ndĀ;ș᳑uit;晦amma;䏝in;拲ƀ;io᳧᳨᳸䃷de脀÷;o᳧ᳰntimes;拇nø᳷cy;䑒cɯᴆ\x00\x00ᴊrn;挞op;挍ʀlptuwᴘᴝᴢᵉᵕlar;䀤f;쀀\uD835\uDD55ʀ;emps̋ᴭᴷᴽᵂqĀ;d͒ᴳot;扑inus;戸lus;戔quare;抡blebarwedgåúnƀadhᄮᵝᵧownarrowóᲃarpoonĀlrᵲᵶefôᲴighôᲶŢᵿᶅkaro÷གɯᶊ\x00\x00ᶎrn;挟op;挌ƀcotᶘᶣᶦĀryᶝᶡ;쀀\uD835\uDCB9;䑕l;槶rok;䄑Ādrᶰᶴot;拱iĀ;fᶺ᠖斿Āah᷀᷃ròЩaòྦangle;榦Āci᷒ᷕy;䑟grarr;柿ऀDacdefglmnopqrstuxḁḉḙḸոḼṉṡṾấắẽỡἪἷὄ὎὚ĀDoḆᴴoôᲉĀcsḎḔute耻é䃩ter;橮ȀaioyḢḧḱḶron;䄛rĀ;cḭḮ扖耻ê䃪lon;払;䑍ot;䄗ĀDrṁṅot;扒;쀀\uD835\uDD22ƀ;rsṐṑṗ檚ave耻è䃨Ā;dṜṝ檖ot;檘Ȁ;ilsṪṫṲṴ檙nters;揧;愓Ā;dṹṺ檕ot;檗ƀapsẅẉẗcr;䄓tyƀ;svẒẓẕ戅et»ẓpĀ1;ẝẤĳạả;怄;怅怃ĀgsẪẬ;䅋p;怂ĀgpẴẸon;䄙f;쀀\uD835\uDD56ƀalsỄỎỒrĀ;sỊị拕l;槣us;橱iƀ;lvỚớở䎵on»ớ;䏵ȀcsuvỪỳἋἣĀioữḱrc»Ḯɩỹ\x00\x00ỻíՈantĀglἂἆtr»ṝess»Ṻƀaeiἒ἖Ἒls;䀽st;扟vĀ;DȵἠD;橸parsl;槥ĀDaἯἳot;打rr;楱ƀcdiἾὁỸr;愯oô͒ĀahὉὋ;䎷耻ð䃰Āmrὓὗl耻ë䃫o;悬ƀcipὡὤὧl;䀡sôծĀeoὬὴctatioîՙnentialåչৡᾒ\x00ᾞ\x00ᾡᾧ\x00\x00ῆῌ\x00ΐ\x00ῦῪ \x00 ⁚llingdotseñṄy;䑄male;晀ƀilrᾭᾳ῁lig;耀ﬃɩᾹ\x00\x00᾽g;耀ﬀig;耀ﬄ;쀀\uD835\uDD23lig;耀ﬁlig;쀀fjƀaltῙ῜ῡt;晭ig;耀ﬂns;斱of;䆒ǰ΅\x00ῳf;쀀\uD835\uDD57ĀakֿῷĀ;vῼ´拔;櫙artint;樍Āao‌⁕Ācs‑⁒α‚‰‸⁅⁈\x00⁐β•‥‧‪‬\x00‮耻½䂽;慓耻¼䂼;慕;慙;慛Ƴ‴\x00‶;慔;慖ʴ‾⁁\x00\x00⁃耻¾䂾;慗;慜5;慘ƶ⁌\x00⁎;慚;慝8;慞l;恄wn;挢cr;쀀\uD835\uDCBBࢀEabcdefgijlnorstv₂₉₟₥₰₴⃰⃵⃺⃿℃ℒℸ̗ℾ⅒↞Ā;lٍ₇;檌ƀcmpₐₕ₝ute;䇵maĀ;dₜ᳚䎳;檆reve;䄟Āiy₪₮rc;䄝;䐳ot;䄡Ȁ;lqsؾق₽⃉ƀ;qsؾٌ⃄lanô٥Ȁ;cdl٥⃒⃥⃕c;檩otĀ;o⃜⃝檀Ā;l⃢⃣檂;檄Ā;e⃪⃭쀀⋛︀s;檔r;쀀\uD835\uDD24Ā;gٳ؛mel;愷cy;䑓Ȁ;Eajٚℌℎℐ;檒;檥;檤ȀEaesℛℝ℩ℴ;扩pĀ;p℣ℤ檊rox»ℤĀ;q℮ℯ檈Ā;q℮ℛim;拧pf;쀀\uD835\uDD58Āci⅃ⅆr;愊mƀ;el٫ⅎ⅐;檎;檐茀>;cdlqr׮ⅠⅪⅮⅳⅹĀciⅥⅧ;檧r;橺ot;拗Par;榕uest;橼ʀadelsↄⅪ←ٖ↛ǰ↉\x00↎proø₞r;楸qĀlqؿ↖lesó₈ií٫Āen↣↭rtneqq;쀀≩︀Å↪ԀAabcefkosy⇄⇇⇱⇵⇺∘∝∯≨≽ròΠȀilmr⇐⇔⇗⇛rsðᒄf»․ilôکĀdr⇠⇤cy;䑊ƀ;cwࣴ⇫⇯ir;楈;憭ar;意irc;䄥ƀalr∁∎∓rtsĀ;u∉∊晥it»∊lip;怦con;抹r;쀀\uD835\uDD25sĀew∣∩arow;椥arow;椦ʀamopr∺∾≃≞≣rr;懿tht;戻kĀlr≉≓eftarrow;憩ightarrow;憪f;쀀\uD835\uDD59bar;怕ƀclt≯≴≸r;쀀\uD835\uDCBDasè⇴rok;䄧Ābp⊂⊇ull;恃hen»ᱛૡ⊣\x00⊪\x00⊸⋅⋎\x00⋕⋳\x00\x00⋸⌢⍧⍢⍿\x00⎆⎪⎴cute耻í䃭ƀ;iyݱ⊰⊵rc耻î䃮;䐸Ācx⊼⊿y;䐵cl耻¡䂡ĀfrΟ⋉;쀀\uD835\uDD26rave耻ì䃬Ȁ;inoܾ⋝⋩⋮Āin⋢⋦nt;樌t;戭fin;槜ta;愩lig;䄳ƀaop⋾⌚⌝ƀcgt⌅⌈⌗r;䄫ƀelpܟ⌏⌓inåގarôܠh;䄱f;抷ed;䆵ʀ;cfotӴ⌬⌱⌽⍁are;愅inĀ;t⌸⌹戞ie;槝doô⌙ʀ;celpݗ⍌⍐⍛⍡al;抺Āgr⍕⍙eróᕣã⍍arhk;樗rod;樼Ȁcgpt⍯⍲⍶⍻y;䑑on;䄯f;쀀\uD835\uDD5Aa;䎹uest耻¿䂿Āci⎊⎏r;쀀\uD835\uDCBEnʀ;EdsvӴ⎛⎝⎡ӳ;拹ot;拵Ā;v⎦⎧拴;拳Ā;iݷ⎮lde;䄩ǫ⎸\x00⎼cy;䑖l耻ï䃯̀cfmosu⏌⏗⏜⏡⏧⏵Āiy⏑⏕rc;䄵;䐹r;쀀\uD835\uDD27ath;䈷pf;쀀\uD835\uDD5Bǣ⏬\x00⏱r;쀀\uD835\uDCBFrcy;䑘kcy;䑔Ѐacfghjos␋␖␢␧␭␱␵␻ppaĀ;v␓␔䎺;䏰Āey␛␠dil;䄷;䐺r;쀀\uD835\uDD28reen;䄸cy;䑅cy;䑜pf;쀀\uD835\uDD5Ccr;쀀\uD835\uDCC0஀ABEHabcdefghjlmnoprstuv⑰⒁⒆⒍⒑┎┽╚▀♎♞♥♹♽⚚⚲⛘❝❨➋⟀⠁⠒ƀart⑷⑺⑼rò৆òΕail;椛arr;椎Ā;gঔ⒋;檋ar;楢ॣ⒥\x00⒪\x00⒱\x00\x00\x00\x00\x00⒵Ⓔ\x00ⓆⓈⓍ\x00⓹ute;䄺mptyv;榴raîࡌbda;䎻gƀ;dlࢎⓁⓃ;榑åࢎ;檅uo耻«䂫rЀ;bfhlpst࢙ⓞⓦⓩ⓫⓮⓱⓵Ā;f࢝ⓣs;椟s;椝ë≒p;憫l;椹im;楳l;憢ƀ;ae⓿─┄檫il;椙Ā;s┉┊檭;쀀⪭︀ƀabr┕┙┝rr;椌rk;杲Āak┢┬cĀek┨┪;䁻;䁛Āes┱┳;榋lĀdu┹┻;榏;榍Ȁaeuy╆╋╖╘ron;䄾Ādi═╔il;䄼ìࢰâ┩;䐻Ȁcqrs╣╦╭╽a;椶uoĀ;rนᝆĀdu╲╷har;楧shar;楋h;憲ʀ;fgqs▋▌উ◳◿扤tʀahlrt▘▤▷◂◨rrowĀ;t࢙□aé⓶arpoonĀdu▯▴own»њp»०eftarrows;懇ightƀahs◍◖◞rrowĀ;sࣴࢧarpoonó྘quigarro÷⇰hreetimes;拋ƀ;qs▋ও◺lanôবʀ;cdgsব☊☍☝☨c;檨otĀ;o☔☕橿Ā;r☚☛檁;檃Ā;e☢☥쀀⋚︀s;檓ʀadegs☳☹☽♉♋pproøⓆot;拖qĀgq♃♅ôউgtò⒌ôছiíলƀilr♕࣡♚sht;楼;쀀\uD835\uDD29Ā;Eজ♣;檑š♩♶rĀdu▲♮Ā;l॥♳;楪lk;斄cy;䑙ʀ;achtੈ⚈⚋⚑⚖rò◁orneòᴈard;楫ri;旺Āio⚟⚤dot;䅀ustĀ;a⚬⚭掰che»⚭ȀEaes⚻⚽⛉⛔;扨pĀ;p⛃⛄檉rox»⛄Ā;q⛎⛏檇Ā;q⛎⚻im;拦Ѐabnoptwz⛩⛴⛷✚✯❁❇❐Ānr⛮⛱g;柬r;懽rëࣁgƀlmr⛿✍✔eftĀar০✇ightá৲apsto;柼ightá৽parrowĀlr✥✩efô⓭ight;憬ƀafl✶✹✽r;榅;쀀\uD835\uDD5Dus;樭imes;樴š❋❏st;戗áፎƀ;ef❗❘᠀旊nge»❘arĀ;l❤❥䀨t;榓ʀachmt❳❶❼➅➇ròࢨorneòᶌarĀ;d྘➃;業;怎ri;抿̀achiqt➘➝ੀ➢➮➻quo;怹r;쀀\uD835\uDCC1mƀ;egল➪➬;檍;檏Ābu┪➳oĀ;rฟ➹;怚rok;䅂萀<;cdhilqrࠫ⟒☹⟜⟠⟥⟪⟰Āci⟗⟙;檦r;橹reå◲mes;拉arr;楶uest;橻ĀPi⟵⟹ar;榖ƀ;ef⠀भ᠛旃rĀdu⠇⠍shar;楊har;楦Āen⠗⠡rtneqq;쀀≨︀Å⠞܀Dacdefhilnopsu⡀⡅⢂⢎⢓⢠⢥⢨⣚⣢⣤ઃ⣳⤂Dot;戺Ȁclpr⡎⡒⡣⡽r耻¯䂯Āet⡗⡙;時Ā;e⡞⡟朠se»⡟Ā;sျ⡨toȀ;dluျ⡳⡷⡻owîҌefôएðᏑker;斮Āoy⢇⢌mma;権;䐼ash;怔asuredangle»ᘦr;쀀\uD835\uDD2Ao;愧ƀcdn⢯⢴⣉ro耻µ䂵Ȁ;acdᑤ⢽⣀⣄sôᚧir;櫰ot肻·Ƶusƀ;bd⣒ᤃ⣓戒Ā;uᴼ⣘;横ţ⣞⣡p;櫛ò−ðઁĀdp⣩⣮els;抧f;쀀\uD835\uDD5EĀct⣸⣽r;쀀\uD835\uDCC2pos»ᖝƀ;lm⤉⤊⤍䎼timap;抸ఀGLRVabcdefghijlmoprstuvw⥂⥓⥾⦉⦘⧚⧩⨕⨚⩘⩝⪃⪕⪤⪨⬄⬇⭄⭿⮮ⰴⱧⱼ⳩Āgt⥇⥋;쀀⋙̸Ā;v⥐௏쀀≫⃒ƀelt⥚⥲⥶ftĀar⥡⥧rrow;懍ightarrow;懎;쀀⋘̸Ā;v⥻ే쀀≪⃒ightarrow;懏ĀDd⦎⦓ash;抯ash;抮ʀbcnpt⦣⦧⦬⦱⧌la»˞ute;䅄g;쀀∠⃒ʀ;Eiop඄⦼⧀⧅⧈;쀀⩰̸d;쀀≋̸s;䅉roø඄urĀ;a⧓⧔普lĀ;s⧓ସǳ⧟\x00⧣p肻 ଷmpĀ;e௹ఀʀaeouy⧴⧾⨃⨐⨓ǰ⧹\x00⧻;橃on;䅈dil;䅆ngĀ;dൾ⨊ot;쀀⩭̸p;橂;䐽ash;怓΀;Aadqsxஒ⨩⨭⨻⩁⩅⩐rr;懗rĀhr⨳⨶k;椤Ā;oᏲᏰot;쀀≐̸uiöୣĀei⩊⩎ar;椨í஘istĀ;s஠டr;쀀\uD835\uDD2BȀEest௅⩦⩹⩼ƀ;qs஼⩭௡ƀ;qs஼௅⩴lanô௢ií௪Ā;rஶ⪁»ஷƀAap⪊⪍⪑rò⥱rr;憮ar;櫲ƀ;svྍ⪜ྌĀ;d⪡⪢拼;拺cy;䑚΀AEadest⪷⪺⪾⫂⫅⫶⫹rò⥦;쀀≦̸rr;憚r;急Ȁ;fqs఻⫎⫣⫯tĀar⫔⫙rro÷⫁ightarro÷⪐ƀ;qs఻⪺⫪lanôౕĀ;sౕ⫴»శiíౝĀ;rవ⫾iĀ;eచథiäඐĀpt⬌⬑f;쀀\uD835\uDD5F膀¬;in⬙⬚⬶䂬nȀ;Edvஉ⬤⬨⬮;쀀⋹̸ot;쀀⋵̸ǡஉ⬳⬵;拷;拶iĀ;vಸ⬼ǡಸ⭁⭃;拾;拽ƀaor⭋⭣⭩rȀ;ast୻⭕⭚⭟lleì୻l;쀀⫽⃥;쀀∂̸lint;樔ƀ;ceಒ⭰⭳uåಥĀ;cಘ⭸Ā;eಒ⭽ñಘȀAait⮈⮋⮝⮧rò⦈rrƀ;cw⮔⮕⮙憛;쀀⤳̸;쀀↝̸ghtarrow»⮕riĀ;eೋೖ΀chimpqu⮽⯍⯙⬄୸⯤⯯Ȁ;cerല⯆ഷ⯉uå൅;쀀\uD835\uDCC3ortɭ⬅\x00\x00⯖ará⭖mĀ;e൮⯟Ā;q൴൳suĀbp⯫⯭å೸åഋƀbcp⯶ⰑⰙȀ;Ees⯿ⰀഢⰄ抄;쀀⫅̸etĀ;eഛⰋqĀ;qണⰀcĀ;eലⰗñസȀ;EesⰢⰣൟⰧ抅;쀀⫆̸etĀ;e൘ⰮqĀ;qൠⰣȀgilrⰽⰿⱅⱇìௗlde耻ñ䃱çృiangleĀlrⱒⱜeftĀ;eచⱚñదightĀ;eೋⱥñ೗Ā;mⱬⱭ䎽ƀ;esⱴⱵⱹ䀣ro;愖p;怇ҀDHadgilrsⲏⲔⲙⲞⲣⲰⲶⳓⳣash;抭arr;椄p;쀀≍⃒ash;抬ĀetⲨⲬ;쀀≥⃒;쀀>⃒nfin;槞ƀAetⲽⳁⳅrr;椂;쀀≤⃒Ā;rⳊⳍ쀀<⃒ie;쀀⊴⃒ĀAtⳘⳜrr;椃rie;쀀⊵⃒im;쀀∼⃒ƀAan⳰⳴ⴂrr;懖rĀhr⳺⳽k;椣Ā;oᏧᏥear;椧ቓ᪕\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00ⴭ\x00ⴸⵈⵠⵥ⵲ⶄᬇ\x00\x00ⶍⶫ\x00ⷈⷎ\x00ⷜ⸙⸫⸾⹃Ācsⴱ᪗ute耻ó䃳ĀiyⴼⵅrĀ;c᪞ⵂ耻ô䃴;䐾ʀabios᪠ⵒⵗǈⵚlac;䅑v;樸old;榼lig;䅓Ācr⵩⵭ir;榿;쀀\uD835\uDD2Cͯ⵹\x00\x00⵼\x00ⶂn;䋛ave耻ò䃲;槁Ābmⶈ෴ar;榵Ȁacitⶕ⶘ⶥⶨrò᪀Āir⶝ⶠr;榾oss;榻nå๒;槀ƀaeiⶱⶵⶹcr;䅍ga;䏉ƀcdnⷀⷅǍron;䎿;榶pf;쀀\uD835\uDD60ƀaelⷔ⷗ǒr;榷rp;榹΀;adiosvⷪⷫⷮ⸈⸍⸐⸖戨rò᪆Ȁ;efmⷷⷸ⸂⸅橝rĀ;oⷾⷿ愴f»ⷿ耻ª䂪耻º䂺gof;抶r;橖lope;橗;橛ƀclo⸟⸡⸧ò⸁ash耻ø䃸l;折iŬⸯ⸴de耻õ䃵esĀ;aǛ⸺s;樶ml耻ö䃶bar;挽ૡ⹞\x00⹽\x00⺀⺝\x00⺢⺹\x00\x00⻋ຜ\x00⼓\x00\x00⼫⾼\x00⿈rȀ;astЃ⹧⹲຅脀¶;l⹭⹮䂶leìЃɩ⹸\x00\x00⹻m;櫳;櫽y;䐿rʀcimpt⺋⺏⺓ᡥ⺗nt;䀥od;䀮il;怰enk;怱r;쀀\uD835\uDD2Dƀimo⺨⺰⺴Ā;v⺭⺮䏆;䏕maô੶ne;明ƀ;tv⺿⻀⻈䏀chfork»´;䏖Āau⻏⻟nĀck⻕⻝kĀ;h⇴⻛;愎ö⇴sҀ;abcdemst⻳⻴ᤈ⻹⻽⼄⼆⼊⼎䀫cir;樣ir;樢Āouᵀ⼂;樥;橲n肻±ຝim;樦wo;樧ƀipu⼙⼠⼥ntint;樕f;쀀\uD835\uDD61nd耻£䂣Ԁ;Eaceinosu່⼿⽁⽄⽇⾁⾉⾒⽾⾶;檳p;檷uå໙Ā;c໎⽌̀;acens່⽙⽟⽦⽨⽾pproø⽃urlyeñ໙ñ໎ƀaes⽯⽶⽺pprox;檹qq;檵im;拨iíໟmeĀ;s⾈ຮ怲ƀEas⽸⾐⽺ð⽵ƀdfp໬⾙⾯ƀals⾠⾥⾪lar;挮ine;挒urf;挓Ā;t໻⾴ï໻rel;抰Āci⿀⿅r;쀀\uD835\uDCC5;䏈ncsp;怈̀fiopsu⿚⋢⿟⿥⿫⿱r;쀀\uD835\uDD2Epf;쀀\uD835\uDD62rime;恗cr;쀀\uD835\uDCC6ƀaeo⿸〉〓tĀei⿾々rnionóڰnt;樖stĀ;e【】䀿ñἙô༔઀ABHabcdefhilmnoprstux぀けさすムㄎㄫㅇㅢㅲㆎ㈆㈕㈤㈩㉘㉮㉲㊐㊰㊷ƀartぇおがròႳòϝail;検aròᱥar;楤΀cdenqrtとふへみわゔヌĀeuねぱ;쀀∽̱te;䅕iãᅮmptyv;榳gȀ;del࿑らるろ;榒;榥å࿑uo耻»䂻rր;abcfhlpstw࿜ガクシスゼゾダッデナp;極Ā;f࿠ゴs;椠;椳s;椞ë≝ð✮l;楅im;楴l;憣;憝Āaiパフil;椚oĀ;nホボ戶aló༞ƀabrョリヮrò៥rk;杳ĀakンヽcĀekヹ・;䁽;䁝Āes㄂㄄;榌lĀduㄊㄌ;榎;榐Ȁaeuyㄗㄜㄧㄩron;䅙Ādiㄡㄥil;䅗ì࿲âヺ;䑀Ȁclqsㄴㄷㄽㅄa;椷dhar;楩uoĀ;rȎȍh;憳ƀacgㅎㅟངlȀ;ipsླྀㅘㅛႜnåႻarôྩt;断ƀilrㅩဣㅮsht;楽;쀀\uD835\uDD2FĀaoㅷㆆrĀduㅽㅿ»ѻĀ;l႑ㆄ;楬Ā;vㆋㆌ䏁;䏱ƀgns㆕ㇹㇼht̀ahlrstㆤㆰ㇂㇘㇤㇮rrowĀ;t࿜ㆭaéトarpoonĀduㆻㆿowîㅾp»႒eftĀah㇊㇐rrowó࿪arpoonóՑightarrows;應quigarro÷ニhreetimes;拌g;䋚ingdotseñἲƀahm㈍㈐㈓rò࿪aòՑ;怏oustĀ;a㈞㈟掱che»㈟mid;櫮Ȁabpt㈲㈽㉀㉒Ānr㈷㈺g;柭r;懾rëဃƀafl㉇㉊㉎r;榆;쀀\uD835\uDD63us;樮imes;樵Āap㉝㉧rĀ;g㉣㉤䀩t;榔olint;樒arò㇣Ȁachq㉻㊀Ⴜ㊅quo;怺r;쀀\uD835\uDCC7Ābu・㊊oĀ;rȔȓƀhir㊗㊛㊠reåㇸmes;拊iȀ;efl㊪ၙᠡ㊫方tri;槎luhar;楨;愞ൡ㋕㋛㋟㌬㌸㍱\x00㍺㎤\x00\x00㏬㏰\x00㐨㑈㑚㒭㒱㓊㓱\x00㘖\x00\x00㘳cute;䅛quï➺Ԁ;Eaceinpsyᇭ㋳㋵㋿㌂㌋㌏㌟㌦㌩;檴ǰ㋺\x00㋼;檸on;䅡uåᇾĀ;dᇳ㌇il;䅟rc;䅝ƀEas㌖㌘㌛;檶p;檺im;择olint;樓iíሄ;䑁otƀ;be㌴ᵇ㌵担;橦΀Aacmstx㍆㍊㍗㍛㍞㍣㍭rr;懘rĀhr㍐㍒ë∨Ā;oਸ਼਴t耻§䂧i;䀻war;椩mĀin㍩ðnuóñt;朶rĀ;o㍶⁕쀀\uD835\uDD30Ȁacoy㎂㎆㎑㎠rp;景Āhy㎋㎏cy;䑉;䑈rtɭ㎙\x00\x00㎜iäᑤaraì⹯耻­䂭Āgm㎨㎴maƀ;fv㎱㎲㎲䏃;䏂Ѐ;deglnprካ㏅㏉㏎㏖㏞㏡㏦ot;橪Ā;q኱ኰĀ;E㏓㏔檞;檠Ā;E㏛㏜檝;檟e;扆lus;樤arr;楲aròᄽȀaeit㏸㐈㐏㐗Āls㏽㐄lsetmé㍪hp;樳parsl;槤Ādlᑣ㐔e;挣Ā;e㐜㐝檪Ā;s㐢㐣檬;쀀⪬︀ƀflp㐮㐳㑂tcy;䑌Ā;b㐸㐹䀯Ā;a㐾㐿槄r;挿f;쀀\uD835\uDD64aĀdr㑍ЂesĀ;u㑔㑕晠it»㑕ƀcsu㑠㑹㒟Āau㑥㑯pĀ;sᆈ㑫;쀀⊓︀pĀ;sᆴ㑵;쀀⊔︀uĀbp㑿㒏ƀ;esᆗᆜ㒆etĀ;eᆗ㒍ñᆝƀ;esᆨᆭ㒖etĀ;eᆨ㒝ñᆮƀ;afᅻ㒦ְrť㒫ֱ»ᅼaròᅈȀcemt㒹㒾㓂㓅r;쀀\uD835\uDCC8tmîñiì㐕aræᆾĀar㓎㓕rĀ;f㓔ឿ昆Āan㓚㓭ightĀep㓣㓪psiloîỠhé⺯s»⡒ʀbcmnp㓻㕞ሉ㖋㖎Ҁ;Edemnprs㔎㔏㔑㔕㔞㔣㔬㔱㔶抂;櫅ot;檽Ā;dᇚ㔚ot;櫃ult;櫁ĀEe㔨㔪;櫋;把lus;檿arr;楹ƀeiu㔽㕒㕕tƀ;en㔎㕅㕋qĀ;qᇚ㔏eqĀ;q㔫㔨m;櫇Ābp㕚㕜;櫕;櫓c̀;acensᇭ㕬㕲㕹㕻㌦pproø㋺urlyeñᇾñᇳƀaes㖂㖈㌛pproø㌚qñ㌗g;晪ڀ123;Edehlmnps㖩㖬㖯ሜ㖲㖴㗀㗉㗕㗚㗟㗨㗭耻¹䂹耻²䂲耻³䂳;櫆Āos㖹㖼t;檾ub;櫘Ā;dሢ㗅ot;櫄sĀou㗏㗒l;柉b;櫗arr;楻ult;櫂ĀEe㗤㗦;櫌;抋lus;櫀ƀeiu㗴㘉㘌tƀ;enሜ㗼㘂qĀ;qሢ㖲eqĀ;q㗧㗤m;櫈Ābp㘑㘓;櫔;櫖ƀAan㘜㘠㘭rr;懙rĀhr㘦㘨ë∮Ā;oਫ਩war;椪lig耻ß䃟௡㙑㙝㙠ዎ㙳㙹\x00㙾㛂\x00\x00\x00\x00\x00㛛㜃\x00㜉㝬\x00\x00\x00㞇ɲ㙖\x00\x00㙛get;挖;䏄rë๟ƀaey㙦㙫㙰ron;䅥dil;䅣;䑂lrec;挕r;쀀\uD835\uDD31Ȁeiko㚆㚝㚵㚼ǲ㚋\x00㚑eĀ4fኄኁaƀ;sv㚘㚙㚛䎸ym;䏑Ācn㚢㚲kĀas㚨㚮pproø዁im»ኬsðኞĀas㚺㚮ð዁rn耻þ䃾Ǭ̟㛆⋧es膀×;bd㛏㛐㛘䃗Ā;aᤏ㛕r;樱;樰ƀeps㛡㛣㜀á⩍Ȁ;bcf҆㛬㛰㛴ot;挶ir;櫱Ā;o㛹㛼쀀\uD835\uDD65rk;櫚á㍢rime;怴ƀaip㜏㜒㝤dåቈ΀adempst㜡㝍㝀㝑㝗㝜㝟ngleʀ;dlqr㜰㜱㜶㝀㝂斵own»ᶻeftĀ;e⠀㜾ñम;扜ightĀ;e㊪㝋ñၚot;旬inus;樺lus;樹b;槍ime;樻ezium;揢ƀcht㝲㝽㞁Āry㝷㝻;쀀\uD835\uDCC9;䑆cy;䑛rok;䅧Āio㞋㞎xô᝷headĀlr㞗㞠eftarro÷ࡏightarrow»ཝऀAHabcdfghlmoprstuw㟐㟓㟗㟤㟰㟼㠎㠜㠣㠴㡑㡝㡫㢩㣌㣒㣪㣶ròϭar;楣Ācr㟜㟢ute耻ú䃺òᅐrǣ㟪\x00㟭y;䑞ve;䅭Āiy㟵㟺rc耻û䃻;䑃ƀabh㠃㠆㠋ròᎭlac;䅱aòᏃĀir㠓㠘sht;楾;쀀\uD835\uDD32rave耻ù䃹š㠧㠱rĀlr㠬㠮»ॗ»ႃlk;斀Āct㠹㡍ɯ㠿\x00\x00㡊rnĀ;e㡅㡆挜r»㡆op;挏ri;旸Āal㡖㡚cr;䅫肻¨͉Āgp㡢㡦on;䅳f;쀀\uD835\uDD66̀adhlsuᅋ㡸㡽፲㢑㢠ownáᎳarpoonĀlr㢈㢌efô㠭ighô㠯iƀ;hl㢙㢚㢜䏅»ᏺon»㢚parrows;懈ƀcit㢰㣄㣈ɯ㢶\x00\x00㣁rnĀ;e㢼㢽挝r»㢽op;挎ng;䅯ri;旹cr;쀀\uD835\uDCCAƀdir㣙㣝㣢ot;拰lde;䅩iĀ;f㜰㣨»᠓Āam㣯㣲rò㢨l耻ü䃼angle;榧ހABDacdeflnoprsz㤜㤟㤩㤭㦵㦸㦽㧟㧤㧨㧳㧹㧽㨁㨠ròϷarĀ;v㤦㤧櫨;櫩asèϡĀnr㤲㤷grt;榜΀eknprst㓣㥆㥋㥒㥝㥤㦖appá␕othinçẖƀhir㓫⻈㥙opô⾵Ā;hᎷ㥢ïㆍĀiu㥩㥭gmá㎳Ābp㥲㦄setneqĀ;q㥽㦀쀀⊊︀;쀀⫋︀setneqĀ;q㦏㦒쀀⊋︀;쀀⫌︀Āhr㦛㦟etá㚜iangleĀlr㦪㦯eft»थight»ၑy;䐲ash»ံƀelr㧄㧒㧗ƀ;beⷪ㧋㧏ar;抻q;扚lip;拮Ābt㧜ᑨaòᑩr;쀀\uD835\uDD33tré㦮suĀbp㧯㧱»ജ»൙pf;쀀\uD835\uDD67roð໻tré㦴Ācu㨆㨋r;쀀\uD835\uDCCBĀbp㨐㨘nĀEe㦀㨖»㥾nĀEe㦒㨞»㦐igzag;榚΀cefoprs㨶㨻㩖㩛㩔㩡㩪irc;䅵Ādi㩀㩑Ābg㩅㩉ar;機eĀ;qᗺ㩏;扙erp;愘r;쀀\uD835\uDD34pf;쀀\uD835\uDD68Ā;eᑹ㩦atèᑹcr;쀀\uD835\uDCCCૣណ㪇\x00㪋\x00㪐㪛\x00\x00㪝㪨㪫㪯\x00\x00㫃㫎\x00㫘ៜ៟tré៑r;쀀\uD835\uDD35ĀAa㪔㪗ròσrò৶;䎾ĀAa㪡㪤ròθrò৫að✓is;拻ƀdptឤ㪵㪾Āfl㪺ឩ;쀀\uD835\uDD69imåឲĀAa㫇㫊ròώròਁĀcq㫒ីr;쀀\uD835\uDCCDĀpt៖㫜ré។Ѐacefiosu㫰㫽㬈㬌㬑㬕㬛㬡cĀuy㫶㫻te耻ý䃽;䑏Āiy㬂㬆rc;䅷;䑋n耻¥䂥r;쀀\uD835\uDD36cy;䑗pf;쀀\uD835\uDD6Acr;쀀\uD835\uDCCEĀcm㬦㬩y;䑎l耻ÿ䃿Ԁacdefhiosw㭂㭈㭔㭘㭤㭩㭭㭴㭺㮀cute;䅺Āay㭍㭒ron;䅾;䐷ot;䅼Āet㭝㭡træᕟa;䎶r;쀀\uD835\uDD37cy;䐶grarr;懝pf;쀀\uD835\uDD6Bcr;쀀\uD835\uDCCFĀjn㮅㮇;怍j;怌".split("").map((c) => c.charCodeAt(0)));

// node_modules/entities/lib/esm/generated/decode-data-xml.js
var decode_data_xml_default = new Uint16Array("Ȁaglq\t\x15\x18\x1Bɭ\x0F\x00\x00\x12p;䀦os;䀧t;䀾t;䀼uot;䀢".split("").map((c) => c.charCodeAt(0)));

// node_modules/entities/lib/esm/decode_codepoint.js
var _a;
var decodeMap = new Map([
  [0, 65533],
  [128, 8364],
  [130, 8218],
  [131, 402],
  [132, 8222],
  [133, 8230],
  [134, 8224],
  [135, 8225],
  [136, 710],
  [137, 8240],
  [138, 352],
  [139, 8249],
  [140, 338],
  [142, 381],
  [145, 8216],
  [146, 8217],
  [147, 8220],
  [148, 8221],
  [149, 8226],
  [150, 8211],
  [151, 8212],
  [152, 732],
  [153, 8482],
  [154, 353],
  [155, 8250],
  [156, 339],
  [158, 382],
  [159, 376]
]);
var fromCodePoint = (_a = String.fromCodePoint) !== null && _a !== undefined ? _a : function(codePoint) {
  let output = "";
  if (codePoint > 65535) {
    codePoint -= 65536;
    output += String.fromCharCode(codePoint >>> 10 & 1023 | 55296);
    codePoint = 56320 | codePoint & 1023;
  }
  output += String.fromCharCode(codePoint);
  return output;
};
function replaceCodePoint(codePoint) {
  var _a2;
  if (codePoint >= 55296 && codePoint <= 57343 || codePoint > 1114111) {
    return 65533;
  }
  return (_a2 = decodeMap.get(codePoint)) !== null && _a2 !== undefined ? _a2 : codePoint;
}
// node_modules/entities/lib/esm/decode.js
var CharCodes;
(function(CharCodes2) {
  CharCodes2[CharCodes2["NUM"] = 35] = "NUM";
  CharCodes2[CharCodes2["SEMI"] = 59] = "SEMI";
  CharCodes2[CharCodes2["EQUALS"] = 61] = "EQUALS";
  CharCodes2[CharCodes2["ZERO"] = 48] = "ZERO";
  CharCodes2[CharCodes2["NINE"] = 57] = "NINE";
  CharCodes2[CharCodes2["LOWER_A"] = 97] = "LOWER_A";
  CharCodes2[CharCodes2["LOWER_F"] = 102] = "LOWER_F";
  CharCodes2[CharCodes2["LOWER_X"] = 120] = "LOWER_X";
  CharCodes2[CharCodes2["LOWER_Z"] = 122] = "LOWER_Z";
  CharCodes2[CharCodes2["UPPER_A"] = 65] = "UPPER_A";
  CharCodes2[CharCodes2["UPPER_F"] = 70] = "UPPER_F";
  CharCodes2[CharCodes2["UPPER_Z"] = 90] = "UPPER_Z";
})(CharCodes || (CharCodes = {}));
var TO_LOWER_BIT = 32;
var BinTrieFlags;
(function(BinTrieFlags2) {
  BinTrieFlags2[BinTrieFlags2["VALUE_LENGTH"] = 49152] = "VALUE_LENGTH";
  BinTrieFlags2[BinTrieFlags2["BRANCH_LENGTH"] = 16256] = "BRANCH_LENGTH";
  BinTrieFlags2[BinTrieFlags2["JUMP_TABLE"] = 127] = "JUMP_TABLE";
})(BinTrieFlags || (BinTrieFlags = {}));
function isNumber2(code) {
  return code >= CharCodes.ZERO && code <= CharCodes.NINE;
}
function isHexadecimalCharacter(code) {
  return code >= CharCodes.UPPER_A && code <= CharCodes.UPPER_F || code >= CharCodes.LOWER_A && code <= CharCodes.LOWER_F;
}
function isAsciiAlphaNumeric(code) {
  return code >= CharCodes.UPPER_A && code <= CharCodes.UPPER_Z || code >= CharCodes.LOWER_A && code <= CharCodes.LOWER_Z || isNumber2(code);
}
function isEntityInAttributeInvalidEnd(code) {
  return code === CharCodes.EQUALS || isAsciiAlphaNumeric(code);
}
var EntityDecoderState;
(function(EntityDecoderState2) {
  EntityDecoderState2[EntityDecoderState2["EntityStart"] = 0] = "EntityStart";
  EntityDecoderState2[EntityDecoderState2["NumericStart"] = 1] = "NumericStart";
  EntityDecoderState2[EntityDecoderState2["NumericDecimal"] = 2] = "NumericDecimal";
  EntityDecoderState2[EntityDecoderState2["NumericHex"] = 3] = "NumericHex";
  EntityDecoderState2[EntityDecoderState2["NamedEntity"] = 4] = "NamedEntity";
})(EntityDecoderState || (EntityDecoderState = {}));
var DecodingMode;
(function(DecodingMode2) {
  DecodingMode2[DecodingMode2["Legacy"] = 0] = "Legacy";
  DecodingMode2[DecodingMode2["Strict"] = 1] = "Strict";
  DecodingMode2[DecodingMode2["Attribute"] = 2] = "Attribute";
})(DecodingMode || (DecodingMode = {}));

class EntityDecoder {
  constructor(decodeTree, emitCodePoint, errors) {
    this.decodeTree = decodeTree;
    this.emitCodePoint = emitCodePoint;
    this.errors = errors;
    this.state = EntityDecoderState.EntityStart;
    this.consumed = 1;
    this.result = 0;
    this.treeIndex = 0;
    this.excess = 1;
    this.decodeMode = DecodingMode.Strict;
  }
  startEntity(decodeMode) {
    this.decodeMode = decodeMode;
    this.state = EntityDecoderState.EntityStart;
    this.result = 0;
    this.treeIndex = 0;
    this.excess = 1;
    this.consumed = 1;
  }
  write(str, offset) {
    switch (this.state) {
      case EntityDecoderState.EntityStart: {
        if (str.charCodeAt(offset) === CharCodes.NUM) {
          this.state = EntityDecoderState.NumericStart;
          this.consumed += 1;
          return this.stateNumericStart(str, offset + 1);
        }
        this.state = EntityDecoderState.NamedEntity;
        return this.stateNamedEntity(str, offset);
      }
      case EntityDecoderState.NumericStart: {
        return this.stateNumericStart(str, offset);
      }
      case EntityDecoderState.NumericDecimal: {
        return this.stateNumericDecimal(str, offset);
      }
      case EntityDecoderState.NumericHex: {
        return this.stateNumericHex(str, offset);
      }
      case EntityDecoderState.NamedEntity: {
        return this.stateNamedEntity(str, offset);
      }
    }
  }
  stateNumericStart(str, offset) {
    if (offset >= str.length) {
      return -1;
    }
    if ((str.charCodeAt(offset) | TO_LOWER_BIT) === CharCodes.LOWER_X) {
      this.state = EntityDecoderState.NumericHex;
      this.consumed += 1;
      return this.stateNumericHex(str, offset + 1);
    }
    this.state = EntityDecoderState.NumericDecimal;
    return this.stateNumericDecimal(str, offset);
  }
  addToNumericResult(str, start, end, base) {
    if (start !== end) {
      const digitCount = end - start;
      this.result = this.result * Math.pow(base, digitCount) + parseInt(str.substr(start, digitCount), base);
      this.consumed += digitCount;
    }
  }
  stateNumericHex(str, offset) {
    const startIdx = offset;
    while (offset < str.length) {
      const char = str.charCodeAt(offset);
      if (isNumber2(char) || isHexadecimalCharacter(char)) {
        offset += 1;
      } else {
        this.addToNumericResult(str, startIdx, offset, 16);
        return this.emitNumericEntity(char, 3);
      }
    }
    this.addToNumericResult(str, startIdx, offset, 16);
    return -1;
  }
  stateNumericDecimal(str, offset) {
    const startIdx = offset;
    while (offset < str.length) {
      const char = str.charCodeAt(offset);
      if (isNumber2(char)) {
        offset += 1;
      } else {
        this.addToNumericResult(str, startIdx, offset, 10);
        return this.emitNumericEntity(char, 2);
      }
    }
    this.addToNumericResult(str, startIdx, offset, 10);
    return -1;
  }
  emitNumericEntity(lastCp, expectedLength) {
    var _a2;
    if (this.consumed <= expectedLength) {
      (_a2 = this.errors) === null || _a2 === undefined || _a2.absenceOfDigitsInNumericCharacterReference(this.consumed);
      return 0;
    }
    if (lastCp === CharCodes.SEMI) {
      this.consumed += 1;
    } else if (this.decodeMode === DecodingMode.Strict) {
      return 0;
    }
    this.emitCodePoint(replaceCodePoint(this.result), this.consumed);
    if (this.errors) {
      if (lastCp !== CharCodes.SEMI) {
        this.errors.missingSemicolonAfterCharacterReference();
      }
      this.errors.validateNumericCharacterReference(this.result);
    }
    return this.consumed;
  }
  stateNamedEntity(str, offset) {
    const { decodeTree } = this;
    let current = decodeTree[this.treeIndex];
    let valueLength = (current & BinTrieFlags.VALUE_LENGTH) >> 14;
    for (;offset < str.length; offset++, this.excess++) {
      const char = str.charCodeAt(offset);
      this.treeIndex = determineBranch(decodeTree, current, this.treeIndex + Math.max(1, valueLength), char);
      if (this.treeIndex < 0) {
        return this.result === 0 || this.decodeMode === DecodingMode.Attribute && (valueLength === 0 || isEntityInAttributeInvalidEnd(char)) ? 0 : this.emitNotTerminatedNamedEntity();
      }
      current = decodeTree[this.treeIndex];
      valueLength = (current & BinTrieFlags.VALUE_LENGTH) >> 14;
      if (valueLength !== 0) {
        if (char === CharCodes.SEMI) {
          return this.emitNamedEntityData(this.treeIndex, valueLength, this.consumed + this.excess);
        }
        if (this.decodeMode !== DecodingMode.Strict) {
          this.result = this.treeIndex;
          this.consumed += this.excess;
          this.excess = 0;
        }
      }
    }
    return -1;
  }
  emitNotTerminatedNamedEntity() {
    var _a2;
    const { result: result3, decodeTree } = this;
    const valueLength = (decodeTree[result3] & BinTrieFlags.VALUE_LENGTH) >> 14;
    this.emitNamedEntityData(result3, valueLength, this.consumed);
    (_a2 = this.errors) === null || _a2 === undefined || _a2.missingSemicolonAfterCharacterReference();
    return this.consumed;
  }
  emitNamedEntityData(result3, valueLength, consumed) {
    const { decodeTree } = this;
    this.emitCodePoint(valueLength === 1 ? decodeTree[result3] & ~BinTrieFlags.VALUE_LENGTH : decodeTree[result3 + 1], consumed);
    if (valueLength === 3) {
      this.emitCodePoint(decodeTree[result3 + 2], consumed);
    }
    return consumed;
  }
  end() {
    var _a2;
    switch (this.state) {
      case EntityDecoderState.NamedEntity: {
        return this.result !== 0 && (this.decodeMode !== DecodingMode.Attribute || this.result === this.treeIndex) ? this.emitNotTerminatedNamedEntity() : 0;
      }
      case EntityDecoderState.NumericDecimal: {
        return this.emitNumericEntity(0, 2);
      }
      case EntityDecoderState.NumericHex: {
        return this.emitNumericEntity(0, 3);
      }
      case EntityDecoderState.NumericStart: {
        (_a2 = this.errors) === null || _a2 === undefined || _a2.absenceOfDigitsInNumericCharacterReference(this.consumed);
        return 0;
      }
      case EntityDecoderState.EntityStart: {
        return 0;
      }
    }
  }
}
function getDecoder(decodeTree) {
  let ret = "";
  const decoder = new EntityDecoder(decodeTree, (str) => ret += fromCodePoint(str));
  return function decodeWithTrie(str, decodeMode) {
    let lastIndex = 0;
    let offset = 0;
    while ((offset = str.indexOf("&", offset)) >= 0) {
      ret += str.slice(lastIndex, offset);
      decoder.startEntity(decodeMode);
      const len = decoder.write(str, offset + 1);
      if (len < 0) {
        lastIndex = offset + decoder.end();
        break;
      }
      lastIndex = offset + len;
      offset = len === 0 ? lastIndex + 1 : lastIndex;
    }
    const result3 = ret + str.slice(lastIndex);
    ret = "";
    return result3;
  };
}
function determineBranch(decodeTree, current, nodeIdx, char) {
  const branchCount = (current & BinTrieFlags.BRANCH_LENGTH) >> 7;
  const jumpOffset = current & BinTrieFlags.JUMP_TABLE;
  if (branchCount === 0) {
    return jumpOffset !== 0 && char === jumpOffset ? nodeIdx : -1;
  }
  if (jumpOffset) {
    const value2 = char - jumpOffset;
    return value2 < 0 || value2 >= branchCount ? -1 : decodeTree[nodeIdx + value2] - 1;
  }
  let lo = nodeIdx;
  let hi = lo + branchCount - 1;
  while (lo <= hi) {
    const mid = lo + hi >>> 1;
    const midVal = decodeTree[mid];
    if (midVal < char) {
      lo = mid + 1;
    } else if (midVal > char) {
      hi = mid - 1;
    } else {
      return decodeTree[mid + branchCount];
    }
  }
  return -1;
}
var htmlDecoder = getDecoder(decode_data_html_default);
var xmlDecoder = getDecoder(decode_data_xml_default);

// node_modules/htmlparser2/lib/esm/Tokenizer.js
var CharCodes2;
(function(CharCodes3) {
  CharCodes3[CharCodes3["Tab"] = 9] = "Tab";
  CharCodes3[CharCodes3["NewLine"] = 10] = "NewLine";
  CharCodes3[CharCodes3["FormFeed"] = 12] = "FormFeed";
  CharCodes3[CharCodes3["CarriageReturn"] = 13] = "CarriageReturn";
  CharCodes3[CharCodes3["Space"] = 32] = "Space";
  CharCodes3[CharCodes3["ExclamationMark"] = 33] = "ExclamationMark";
  CharCodes3[CharCodes3["Number"] = 35] = "Number";
  CharCodes3[CharCodes3["Amp"] = 38] = "Amp";
  CharCodes3[CharCodes3["SingleQuote"] = 39] = "SingleQuote";
  CharCodes3[CharCodes3["DoubleQuote"] = 34] = "DoubleQuote";
  CharCodes3[CharCodes3["Dash"] = 45] = "Dash";
  CharCodes3[CharCodes3["Slash"] = 47] = "Slash";
  CharCodes3[CharCodes3["Zero"] = 48] = "Zero";
  CharCodes3[CharCodes3["Nine"] = 57] = "Nine";
  CharCodes3[CharCodes3["Semi"] = 59] = "Semi";
  CharCodes3[CharCodes3["Lt"] = 60] = "Lt";
  CharCodes3[CharCodes3["Eq"] = 61] = "Eq";
  CharCodes3[CharCodes3["Gt"] = 62] = "Gt";
  CharCodes3[CharCodes3["Questionmark"] = 63] = "Questionmark";
  CharCodes3[CharCodes3["UpperA"] = 65] = "UpperA";
  CharCodes3[CharCodes3["LowerA"] = 97] = "LowerA";
  CharCodes3[CharCodes3["UpperF"] = 70] = "UpperF";
  CharCodes3[CharCodes3["LowerF"] = 102] = "LowerF";
  CharCodes3[CharCodes3["UpperZ"] = 90] = "UpperZ";
  CharCodes3[CharCodes3["LowerZ"] = 122] = "LowerZ";
  CharCodes3[CharCodes3["LowerX"] = 120] = "LowerX";
  CharCodes3[CharCodes3["OpeningSquareBracket"] = 91] = "OpeningSquareBracket";
})(CharCodes2 || (CharCodes2 = {}));
var State;
(function(State2) {
  State2[State2["Text"] = 1] = "Text";
  State2[State2["BeforeTagName"] = 2] = "BeforeTagName";
  State2[State2["InTagName"] = 3] = "InTagName";
  State2[State2["InSelfClosingTag"] = 4] = "InSelfClosingTag";
  State2[State2["BeforeClosingTagName"] = 5] = "BeforeClosingTagName";
  State2[State2["InClosingTagName"] = 6] = "InClosingTagName";
  State2[State2["AfterClosingTagName"] = 7] = "AfterClosingTagName";
  State2[State2["BeforeAttributeName"] = 8] = "BeforeAttributeName";
  State2[State2["InAttributeName"] = 9] = "InAttributeName";
  State2[State2["AfterAttributeName"] = 10] = "AfterAttributeName";
  State2[State2["BeforeAttributeValue"] = 11] = "BeforeAttributeValue";
  State2[State2["InAttributeValueDq"] = 12] = "InAttributeValueDq";
  State2[State2["InAttributeValueSq"] = 13] = "InAttributeValueSq";
  State2[State2["InAttributeValueNq"] = 14] = "InAttributeValueNq";
  State2[State2["BeforeDeclaration"] = 15] = "BeforeDeclaration";
  State2[State2["InDeclaration"] = 16] = "InDeclaration";
  State2[State2["InProcessingInstruction"] = 17] = "InProcessingInstruction";
  State2[State2["BeforeComment"] = 18] = "BeforeComment";
  State2[State2["CDATASequence"] = 19] = "CDATASequence";
  State2[State2["InSpecialComment"] = 20] = "InSpecialComment";
  State2[State2["InCommentLike"] = 21] = "InCommentLike";
  State2[State2["BeforeSpecialS"] = 22] = "BeforeSpecialS";
  State2[State2["SpecialStartSequence"] = 23] = "SpecialStartSequence";
  State2[State2["InSpecialTag"] = 24] = "InSpecialTag";
  State2[State2["BeforeEntity"] = 25] = "BeforeEntity";
  State2[State2["BeforeNumericEntity"] = 26] = "BeforeNumericEntity";
  State2[State2["InNamedEntity"] = 27] = "InNamedEntity";
  State2[State2["InNumericEntity"] = 28] = "InNumericEntity";
  State2[State2["InHexEntity"] = 29] = "InHexEntity";
})(State || (State = {}));
function isWhitespace(c) {
  return c === CharCodes2.Space || c === CharCodes2.NewLine || c === CharCodes2.Tab || c === CharCodes2.FormFeed || c === CharCodes2.CarriageReturn;
}
function isEndOfTagSection(c) {
  return c === CharCodes2.Slash || c === CharCodes2.Gt || isWhitespace(c);
}
function isNumber3(c) {
  return c >= CharCodes2.Zero && c <= CharCodes2.Nine;
}
function isASCIIAlpha(c) {
  return c >= CharCodes2.LowerA && c <= CharCodes2.LowerZ || c >= CharCodes2.UpperA && c <= CharCodes2.UpperZ;
}
function isHexDigit(c) {
  return c >= CharCodes2.UpperA && c <= CharCodes2.UpperF || c >= CharCodes2.LowerA && c <= CharCodes2.LowerF;
}
var QuoteType;
(function(QuoteType2) {
  QuoteType2[QuoteType2["NoValue"] = 0] = "NoValue";
  QuoteType2[QuoteType2["Unquoted"] = 1] = "Unquoted";
  QuoteType2[QuoteType2["Single"] = 2] = "Single";
  QuoteType2[QuoteType2["Double"] = 3] = "Double";
})(QuoteType || (QuoteType = {}));
var Sequences = {
  Cdata: new Uint8Array([67, 68, 65, 84, 65, 91]),
  CdataEnd: new Uint8Array([93, 93, 62]),
  CommentEnd: new Uint8Array([45, 45, 62]),
  ScriptEnd: new Uint8Array([60, 47, 115, 99, 114, 105, 112, 116]),
  StyleEnd: new Uint8Array([60, 47, 115, 116, 121, 108, 101]),
  TitleEnd: new Uint8Array([60, 47, 116, 105, 116, 108, 101])
};

class Tokenizer {
  constructor({ xmlMode = false, decodeEntities = true }, cbs) {
    this.cbs = cbs;
    this.state = State.Text;
    this.buffer = "";
    this.sectionStart = 0;
    this.index = 0;
    this.baseState = State.Text;
    this.isSpecial = false;
    this.running = true;
    this.offset = 0;
    this.currentSequence = undefined;
    this.sequenceIndex = 0;
    this.trieIndex = 0;
    this.trieCurrent = 0;
    this.entityResult = 0;
    this.entityExcess = 0;
    this.xmlMode = xmlMode;
    this.decodeEntities = decodeEntities;
    this.entityTrie = xmlMode ? decode_data_xml_default : decode_data_html_default;
  }
  reset() {
    this.state = State.Text;
    this.buffer = "";
    this.sectionStart = 0;
    this.index = 0;
    this.baseState = State.Text;
    this.currentSequence = undefined;
    this.running = true;
    this.offset = 0;
  }
  write(chunk) {
    this.offset += this.buffer.length;
    this.buffer = chunk;
    this.parse();
  }
  end() {
    if (this.running)
      this.finish();
  }
  pause() {
    this.running = false;
  }
  resume() {
    this.running = true;
    if (this.index < this.buffer.length + this.offset) {
      this.parse();
    }
  }
  getIndex() {
    return this.index;
  }
  getSectionStart() {
    return this.sectionStart;
  }
  stateText(c) {
    if (c === CharCodes2.Lt || !this.decodeEntities && this.fastForwardTo(CharCodes2.Lt)) {
      if (this.index > this.sectionStart) {
        this.cbs.ontext(this.sectionStart, this.index);
      }
      this.state = State.BeforeTagName;
      this.sectionStart = this.index;
    } else if (this.decodeEntities && c === CharCodes2.Amp) {
      this.state = State.BeforeEntity;
    }
  }
  stateSpecialStartSequence(c) {
    const isEnd = this.sequenceIndex === this.currentSequence.length;
    const isMatch = isEnd ? isEndOfTagSection(c) : (c | 32) === this.currentSequence[this.sequenceIndex];
    if (!isMatch) {
      this.isSpecial = false;
    } else if (!isEnd) {
      this.sequenceIndex++;
      return;
    }
    this.sequenceIndex = 0;
    this.state = State.InTagName;
    this.stateInTagName(c);
  }
  stateInSpecialTag(c) {
    if (this.sequenceIndex === this.currentSequence.length) {
      if (c === CharCodes2.Gt || isWhitespace(c)) {
        const endOfText = this.index - this.currentSequence.length;
        if (this.sectionStart < endOfText) {
          const actualIndex = this.index;
          this.index = endOfText;
          this.cbs.ontext(this.sectionStart, endOfText);
          this.index = actualIndex;
        }
        this.isSpecial = false;
        this.sectionStart = endOfText + 2;
        this.stateInClosingTagName(c);
        return;
      }
      this.sequenceIndex = 0;
    }
    if ((c | 32) === this.currentSequence[this.sequenceIndex]) {
      this.sequenceIndex += 1;
    } else if (this.sequenceIndex === 0) {
      if (this.currentSequence === Sequences.TitleEnd) {
        if (this.decodeEntities && c === CharCodes2.Amp) {
          this.state = State.BeforeEntity;
        }
      } else if (this.fastForwardTo(CharCodes2.Lt)) {
        this.sequenceIndex = 1;
      }
    } else {
      this.sequenceIndex = Number(c === CharCodes2.Lt);
    }
  }
  stateCDATASequence(c) {
    if (c === Sequences.Cdata[this.sequenceIndex]) {
      if (++this.sequenceIndex === Sequences.Cdata.length) {
        this.state = State.InCommentLike;
        this.currentSequence = Sequences.CdataEnd;
        this.sequenceIndex = 0;
        this.sectionStart = this.index + 1;
      }
    } else {
      this.sequenceIndex = 0;
      this.state = State.InDeclaration;
      this.stateInDeclaration(c);
    }
  }
  fastForwardTo(c) {
    while (++this.index < this.buffer.length + this.offset) {
      if (this.buffer.charCodeAt(this.index - this.offset) === c) {
        return true;
      }
    }
    this.index = this.buffer.length + this.offset - 1;
    return false;
  }
  stateInCommentLike(c) {
    if (c === this.currentSequence[this.sequenceIndex]) {
      if (++this.sequenceIndex === this.currentSequence.length) {
        if (this.currentSequence === Sequences.CdataEnd) {
          this.cbs.oncdata(this.sectionStart, this.index, 2);
        } else {
          this.cbs.oncomment(this.sectionStart, this.index, 2);
        }
        this.sequenceIndex = 0;
        this.sectionStart = this.index + 1;
        this.state = State.Text;
      }
    } else if (this.sequenceIndex === 0) {
      if (this.fastForwardTo(this.currentSequence[0])) {
        this.sequenceIndex = 1;
      }
    } else if (c !== this.currentSequence[this.sequenceIndex - 1]) {
      this.sequenceIndex = 0;
    }
  }
  isTagStartChar(c) {
    return this.xmlMode ? !isEndOfTagSection(c) : isASCIIAlpha(c);
  }
  startSpecial(sequence, offset) {
    this.isSpecial = true;
    this.currentSequence = sequence;
    this.sequenceIndex = offset;
    this.state = State.SpecialStartSequence;
  }
  stateBeforeTagName(c) {
    if (c === CharCodes2.ExclamationMark) {
      this.state = State.BeforeDeclaration;
      this.sectionStart = this.index + 1;
    } else if (c === CharCodes2.Questionmark) {
      this.state = State.InProcessingInstruction;
      this.sectionStart = this.index + 1;
    } else if (this.isTagStartChar(c)) {
      const lower = c | 32;
      this.sectionStart = this.index;
      if (!this.xmlMode && lower === Sequences.TitleEnd[2]) {
        this.startSpecial(Sequences.TitleEnd, 3);
      } else {
        this.state = !this.xmlMode && lower === Sequences.ScriptEnd[2] ? State.BeforeSpecialS : State.InTagName;
      }
    } else if (c === CharCodes2.Slash) {
      this.state = State.BeforeClosingTagName;
    } else {
      this.state = State.Text;
      this.stateText(c);
    }
  }
  stateInTagName(c) {
    if (isEndOfTagSection(c)) {
      this.cbs.onopentagname(this.sectionStart, this.index);
      this.sectionStart = -1;
      this.state = State.BeforeAttributeName;
      this.stateBeforeAttributeName(c);
    }
  }
  stateBeforeClosingTagName(c) {
    if (isWhitespace(c)) {} else if (c === CharCodes2.Gt) {
      this.state = State.Text;
    } else {
      this.state = this.isTagStartChar(c) ? State.InClosingTagName : State.InSpecialComment;
      this.sectionStart = this.index;
    }
  }
  stateInClosingTagName(c) {
    if (c === CharCodes2.Gt || isWhitespace(c)) {
      this.cbs.onclosetag(this.sectionStart, this.index);
      this.sectionStart = -1;
      this.state = State.AfterClosingTagName;
      this.stateAfterClosingTagName(c);
    }
  }
  stateAfterClosingTagName(c) {
    if (c === CharCodes2.Gt || this.fastForwardTo(CharCodes2.Gt)) {
      this.state = State.Text;
      this.baseState = State.Text;
      this.sectionStart = this.index + 1;
    }
  }
  stateBeforeAttributeName(c) {
    if (c === CharCodes2.Gt) {
      this.cbs.onopentagend(this.index);
      if (this.isSpecial) {
        this.state = State.InSpecialTag;
        this.sequenceIndex = 0;
      } else {
        this.state = State.Text;
      }
      this.baseState = this.state;
      this.sectionStart = this.index + 1;
    } else if (c === CharCodes2.Slash) {
      this.state = State.InSelfClosingTag;
    } else if (!isWhitespace(c)) {
      this.state = State.InAttributeName;
      this.sectionStart = this.index;
    }
  }
  stateInSelfClosingTag(c) {
    if (c === CharCodes2.Gt) {
      this.cbs.onselfclosingtag(this.index);
      this.state = State.Text;
      this.baseState = State.Text;
      this.sectionStart = this.index + 1;
      this.isSpecial = false;
    } else if (!isWhitespace(c)) {
      this.state = State.BeforeAttributeName;
      this.stateBeforeAttributeName(c);
    }
  }
  stateInAttributeName(c) {
    if (c === CharCodes2.Eq || isEndOfTagSection(c)) {
      this.cbs.onattribname(this.sectionStart, this.index);
      this.sectionStart = -1;
      this.state = State.AfterAttributeName;
      this.stateAfterAttributeName(c);
    }
  }
  stateAfterAttributeName(c) {
    if (c === CharCodes2.Eq) {
      this.state = State.BeforeAttributeValue;
    } else if (c === CharCodes2.Slash || c === CharCodes2.Gt) {
      this.cbs.onattribend(QuoteType.NoValue, this.index);
      this.state = State.BeforeAttributeName;
      this.stateBeforeAttributeName(c);
    } else if (!isWhitespace(c)) {
      this.cbs.onattribend(QuoteType.NoValue, this.index);
      this.state = State.InAttributeName;
      this.sectionStart = this.index;
    }
  }
  stateBeforeAttributeValue(c) {
    if (c === CharCodes2.DoubleQuote) {
      this.state = State.InAttributeValueDq;
      this.sectionStart = this.index + 1;
    } else if (c === CharCodes2.SingleQuote) {
      this.state = State.InAttributeValueSq;
      this.sectionStart = this.index + 1;
    } else if (!isWhitespace(c)) {
      this.sectionStart = this.index;
      this.state = State.InAttributeValueNq;
      this.stateInAttributeValueNoQuotes(c);
    }
  }
  handleInAttributeValue(c, quote) {
    if (c === quote || !this.decodeEntities && this.fastForwardTo(quote)) {
      this.cbs.onattribdata(this.sectionStart, this.index);
      this.sectionStart = -1;
      this.cbs.onattribend(quote === CharCodes2.DoubleQuote ? QuoteType.Double : QuoteType.Single, this.index);
      this.state = State.BeforeAttributeName;
    } else if (this.decodeEntities && c === CharCodes2.Amp) {
      this.baseState = this.state;
      this.state = State.BeforeEntity;
    }
  }
  stateInAttributeValueDoubleQuotes(c) {
    this.handleInAttributeValue(c, CharCodes2.DoubleQuote);
  }
  stateInAttributeValueSingleQuotes(c) {
    this.handleInAttributeValue(c, CharCodes2.SingleQuote);
  }
  stateInAttributeValueNoQuotes(c) {
    if (isWhitespace(c) || c === CharCodes2.Gt) {
      this.cbs.onattribdata(this.sectionStart, this.index);
      this.sectionStart = -1;
      this.cbs.onattribend(QuoteType.Unquoted, this.index);
      this.state = State.BeforeAttributeName;
      this.stateBeforeAttributeName(c);
    } else if (this.decodeEntities && c === CharCodes2.Amp) {
      this.baseState = this.state;
      this.state = State.BeforeEntity;
    }
  }
  stateBeforeDeclaration(c) {
    if (c === CharCodes2.OpeningSquareBracket) {
      this.state = State.CDATASequence;
      this.sequenceIndex = 0;
    } else {
      this.state = c === CharCodes2.Dash ? State.BeforeComment : State.InDeclaration;
    }
  }
  stateInDeclaration(c) {
    if (c === CharCodes2.Gt || this.fastForwardTo(CharCodes2.Gt)) {
      this.cbs.ondeclaration(this.sectionStart, this.index);
      this.state = State.Text;
      this.sectionStart = this.index + 1;
    }
  }
  stateInProcessingInstruction(c) {
    if (c === CharCodes2.Gt || this.fastForwardTo(CharCodes2.Gt)) {
      this.cbs.onprocessinginstruction(this.sectionStart, this.index);
      this.state = State.Text;
      this.sectionStart = this.index + 1;
    }
  }
  stateBeforeComment(c) {
    if (c === CharCodes2.Dash) {
      this.state = State.InCommentLike;
      this.currentSequence = Sequences.CommentEnd;
      this.sequenceIndex = 2;
      this.sectionStart = this.index + 1;
    } else {
      this.state = State.InDeclaration;
    }
  }
  stateInSpecialComment(c) {
    if (c === CharCodes2.Gt || this.fastForwardTo(CharCodes2.Gt)) {
      this.cbs.oncomment(this.sectionStart, this.index, 0);
      this.state = State.Text;
      this.sectionStart = this.index + 1;
    }
  }
  stateBeforeSpecialS(c) {
    const lower = c | 32;
    if (lower === Sequences.ScriptEnd[3]) {
      this.startSpecial(Sequences.ScriptEnd, 4);
    } else if (lower === Sequences.StyleEnd[3]) {
      this.startSpecial(Sequences.StyleEnd, 4);
    } else {
      this.state = State.InTagName;
      this.stateInTagName(c);
    }
  }
  stateBeforeEntity(c) {
    this.entityExcess = 1;
    this.entityResult = 0;
    if (c === CharCodes2.Number) {
      this.state = State.BeforeNumericEntity;
    } else if (c === CharCodes2.Amp) {} else {
      this.trieIndex = 0;
      this.trieCurrent = this.entityTrie[0];
      this.state = State.InNamedEntity;
      this.stateInNamedEntity(c);
    }
  }
  stateInNamedEntity(c) {
    this.entityExcess += 1;
    this.trieIndex = determineBranch(this.entityTrie, this.trieCurrent, this.trieIndex + 1, c);
    if (this.trieIndex < 0) {
      this.emitNamedEntity();
      this.index--;
      return;
    }
    this.trieCurrent = this.entityTrie[this.trieIndex];
    const masked = this.trieCurrent & BinTrieFlags.VALUE_LENGTH;
    if (masked) {
      const valueLength = (masked >> 14) - 1;
      if (!this.allowLegacyEntity() && c !== CharCodes2.Semi) {
        this.trieIndex += valueLength;
      } else {
        const entityStart = this.index - this.entityExcess + 1;
        if (entityStart > this.sectionStart) {
          this.emitPartial(this.sectionStart, entityStart);
        }
        this.entityResult = this.trieIndex;
        this.trieIndex += valueLength;
        this.entityExcess = 0;
        this.sectionStart = this.index + 1;
        if (valueLength === 0) {
          this.emitNamedEntity();
        }
      }
    }
  }
  emitNamedEntity() {
    this.state = this.baseState;
    if (this.entityResult === 0) {
      return;
    }
    const valueLength = (this.entityTrie[this.entityResult] & BinTrieFlags.VALUE_LENGTH) >> 14;
    switch (valueLength) {
      case 1: {
        this.emitCodePoint(this.entityTrie[this.entityResult] & ~BinTrieFlags.VALUE_LENGTH);
        break;
      }
      case 2: {
        this.emitCodePoint(this.entityTrie[this.entityResult + 1]);
        break;
      }
      case 3: {
        this.emitCodePoint(this.entityTrie[this.entityResult + 1]);
        this.emitCodePoint(this.entityTrie[this.entityResult + 2]);
      }
    }
  }
  stateBeforeNumericEntity(c) {
    if ((c | 32) === CharCodes2.LowerX) {
      this.entityExcess++;
      this.state = State.InHexEntity;
    } else {
      this.state = State.InNumericEntity;
      this.stateInNumericEntity(c);
    }
  }
  emitNumericEntity(strict) {
    const entityStart = this.index - this.entityExcess - 1;
    const numberStart = entityStart + 2 + Number(this.state === State.InHexEntity);
    if (numberStart !== this.index) {
      if (entityStart > this.sectionStart) {
        this.emitPartial(this.sectionStart, entityStart);
      }
      this.sectionStart = this.index + Number(strict);
      this.emitCodePoint(replaceCodePoint(this.entityResult));
    }
    this.state = this.baseState;
  }
  stateInNumericEntity(c) {
    if (c === CharCodes2.Semi) {
      this.emitNumericEntity(true);
    } else if (isNumber3(c)) {
      this.entityResult = this.entityResult * 10 + (c - CharCodes2.Zero);
      this.entityExcess++;
    } else {
      if (this.allowLegacyEntity()) {
        this.emitNumericEntity(false);
      } else {
        this.state = this.baseState;
      }
      this.index--;
    }
  }
  stateInHexEntity(c) {
    if (c === CharCodes2.Semi) {
      this.emitNumericEntity(true);
    } else if (isNumber3(c)) {
      this.entityResult = this.entityResult * 16 + (c - CharCodes2.Zero);
      this.entityExcess++;
    } else if (isHexDigit(c)) {
      this.entityResult = this.entityResult * 16 + ((c | 32) - CharCodes2.LowerA + 10);
      this.entityExcess++;
    } else {
      if (this.allowLegacyEntity()) {
        this.emitNumericEntity(false);
      } else {
        this.state = this.baseState;
      }
      this.index--;
    }
  }
  allowLegacyEntity() {
    return !this.xmlMode && (this.baseState === State.Text || this.baseState === State.InSpecialTag);
  }
  cleanup() {
    if (this.running && this.sectionStart !== this.index) {
      if (this.state === State.Text || this.state === State.InSpecialTag && this.sequenceIndex === 0) {
        this.cbs.ontext(this.sectionStart, this.index);
        this.sectionStart = this.index;
      } else if (this.state === State.InAttributeValueDq || this.state === State.InAttributeValueSq || this.state === State.InAttributeValueNq) {
        this.cbs.onattribdata(this.sectionStart, this.index);
        this.sectionStart = this.index;
      }
    }
  }
  shouldContinue() {
    return this.index < this.buffer.length + this.offset && this.running;
  }
  parse() {
    while (this.shouldContinue()) {
      const c = this.buffer.charCodeAt(this.index - this.offset);
      switch (this.state) {
        case State.Text: {
          this.stateText(c);
          break;
        }
        case State.SpecialStartSequence: {
          this.stateSpecialStartSequence(c);
          break;
        }
        case State.InSpecialTag: {
          this.stateInSpecialTag(c);
          break;
        }
        case State.CDATASequence: {
          this.stateCDATASequence(c);
          break;
        }
        case State.InAttributeValueDq: {
          this.stateInAttributeValueDoubleQuotes(c);
          break;
        }
        case State.InAttributeName: {
          this.stateInAttributeName(c);
          break;
        }
        case State.InCommentLike: {
          this.stateInCommentLike(c);
          break;
        }
        case State.InSpecialComment: {
          this.stateInSpecialComment(c);
          break;
        }
        case State.BeforeAttributeName: {
          this.stateBeforeAttributeName(c);
          break;
        }
        case State.InTagName: {
          this.stateInTagName(c);
          break;
        }
        case State.InClosingTagName: {
          this.stateInClosingTagName(c);
          break;
        }
        case State.BeforeTagName: {
          this.stateBeforeTagName(c);
          break;
        }
        case State.AfterAttributeName: {
          this.stateAfterAttributeName(c);
          break;
        }
        case State.InAttributeValueSq: {
          this.stateInAttributeValueSingleQuotes(c);
          break;
        }
        case State.BeforeAttributeValue: {
          this.stateBeforeAttributeValue(c);
          break;
        }
        case State.BeforeClosingTagName: {
          this.stateBeforeClosingTagName(c);
          break;
        }
        case State.AfterClosingTagName: {
          this.stateAfterClosingTagName(c);
          break;
        }
        case State.BeforeSpecialS: {
          this.stateBeforeSpecialS(c);
          break;
        }
        case State.InAttributeValueNq: {
          this.stateInAttributeValueNoQuotes(c);
          break;
        }
        case State.InSelfClosingTag: {
          this.stateInSelfClosingTag(c);
          break;
        }
        case State.InDeclaration: {
          this.stateInDeclaration(c);
          break;
        }
        case State.BeforeDeclaration: {
          this.stateBeforeDeclaration(c);
          break;
        }
        case State.BeforeComment: {
          this.stateBeforeComment(c);
          break;
        }
        case State.InProcessingInstruction: {
          this.stateInProcessingInstruction(c);
          break;
        }
        case State.InNamedEntity: {
          this.stateInNamedEntity(c);
          break;
        }
        case State.BeforeEntity: {
          this.stateBeforeEntity(c);
          break;
        }
        case State.InHexEntity: {
          this.stateInHexEntity(c);
          break;
        }
        case State.InNumericEntity: {
          this.stateInNumericEntity(c);
          break;
        }
        default: {
          this.stateBeforeNumericEntity(c);
        }
      }
      this.index++;
    }
    this.cleanup();
  }
  finish() {
    if (this.state === State.InNamedEntity) {
      this.emitNamedEntity();
    }
    if (this.sectionStart < this.index) {
      this.handleTrailingData();
    }
    this.cbs.onend();
  }
  handleTrailingData() {
    const endIndex = this.buffer.length + this.offset;
    if (this.state === State.InCommentLike) {
      if (this.currentSequence === Sequences.CdataEnd) {
        this.cbs.oncdata(this.sectionStart, endIndex, 0);
      } else {
        this.cbs.oncomment(this.sectionStart, endIndex, 0);
      }
    } else if (this.state === State.InNumericEntity && this.allowLegacyEntity()) {
      this.emitNumericEntity(false);
    } else if (this.state === State.InHexEntity && this.allowLegacyEntity()) {
      this.emitNumericEntity(false);
    } else if (this.state === State.InTagName || this.state === State.BeforeAttributeName || this.state === State.BeforeAttributeValue || this.state === State.AfterAttributeName || this.state === State.InAttributeName || this.state === State.InAttributeValueSq || this.state === State.InAttributeValueDq || this.state === State.InAttributeValueNq || this.state === State.InClosingTagName) {} else {
      this.cbs.ontext(this.sectionStart, endIndex);
    }
  }
  emitPartial(start, endIndex) {
    if (this.baseState !== State.Text && this.baseState !== State.InSpecialTag) {
      this.cbs.onattribdata(start, endIndex);
    } else {
      this.cbs.ontext(start, endIndex);
    }
  }
  emitCodePoint(cp) {
    if (this.baseState !== State.Text && this.baseState !== State.InSpecialTag) {
      this.cbs.onattribentity(cp);
    } else {
      this.cbs.ontextentity(cp);
    }
  }
}

// node_modules/htmlparser2/lib/esm/Parser.js
var formTags = new Set([
  "input",
  "option",
  "optgroup",
  "select",
  "button",
  "datalist",
  "textarea"
]);
var pTag = new Set(["p"]);
var tableSectionTags = new Set(["thead", "tbody"]);
var ddtTags = new Set(["dd", "dt"]);
var rtpTags = new Set(["rt", "rp"]);
var openImpliesClose = new Map([
  ["tr", new Set(["tr", "th", "td"])],
  ["th", new Set(["th"])],
  ["td", new Set(["thead", "th", "td"])],
  ["body", new Set(["head", "link", "script"])],
  ["li", new Set(["li"])],
  ["p", pTag],
  ["h1", pTag],
  ["h2", pTag],
  ["h3", pTag],
  ["h4", pTag],
  ["h5", pTag],
  ["h6", pTag],
  ["select", formTags],
  ["input", formTags],
  ["output", formTags],
  ["button", formTags],
  ["datalist", formTags],
  ["textarea", formTags],
  ["option", new Set(["option"])],
  ["optgroup", new Set(["optgroup", "option"])],
  ["dd", ddtTags],
  ["dt", ddtTags],
  ["address", pTag],
  ["article", pTag],
  ["aside", pTag],
  ["blockquote", pTag],
  ["details", pTag],
  ["div", pTag],
  ["dl", pTag],
  ["fieldset", pTag],
  ["figcaption", pTag],
  ["figure", pTag],
  ["footer", pTag],
  ["form", pTag],
  ["header", pTag],
  ["hr", pTag],
  ["main", pTag],
  ["nav", pTag],
  ["ol", pTag],
  ["pre", pTag],
  ["section", pTag],
  ["table", pTag],
  ["ul", pTag],
  ["rt", rtpTags],
  ["rp", rtpTags],
  ["tbody", tableSectionTags],
  ["tfoot", tableSectionTags]
]);
var voidElements = new Set([
  "area",
  "base",
  "basefont",
  "br",
  "col",
  "command",
  "embed",
  "frame",
  "hr",
  "img",
  "input",
  "isindex",
  "keygen",
  "link",
  "meta",
  "param",
  "source",
  "track",
  "wbr"
]);
var foreignContextElements = new Set(["math", "svg"]);
var htmlIntegrationElements = new Set([
  "mi",
  "mo",
  "mn",
  "ms",
  "mtext",
  "annotation-xml",
  "foreignobject",
  "desc",
  "title"
]);
var reNameEnd = /\s|\//;

class Parser {
  constructor(cbs, options3 = {}) {
    var _a2, _b, _c, _d, _e;
    this.options = options3;
    this.startIndex = 0;
    this.endIndex = 0;
    this.openTagStart = 0;
    this.tagname = "";
    this.attribname = "";
    this.attribvalue = "";
    this.attribs = null;
    this.stack = [];
    this.foreignContext = [];
    this.buffers = [];
    this.bufferOffset = 0;
    this.writeIndex = 0;
    this.ended = false;
    this.cbs = cbs !== null && cbs !== undefined ? cbs : {};
    this.lowerCaseTagNames = (_a2 = options3.lowerCaseTags) !== null && _a2 !== undefined ? _a2 : !options3.xmlMode;
    this.lowerCaseAttributeNames = (_b = options3.lowerCaseAttributeNames) !== null && _b !== undefined ? _b : !options3.xmlMode;
    this.tokenizer = new ((_c = options3.Tokenizer) !== null && _c !== undefined ? _c : Tokenizer)(this.options, this);
    (_e = (_d = this.cbs).onparserinit) === null || _e === undefined || _e.call(_d, this);
  }
  ontext(start, endIndex) {
    var _a2, _b;
    const data = this.getSlice(start, endIndex);
    this.endIndex = endIndex - 1;
    (_b = (_a2 = this.cbs).ontext) === null || _b === undefined || _b.call(_a2, data);
    this.startIndex = endIndex;
  }
  ontextentity(cp) {
    var _a2, _b;
    const index = this.tokenizer.getSectionStart();
    this.endIndex = index - 1;
    (_b = (_a2 = this.cbs).ontext) === null || _b === undefined || _b.call(_a2, fromCodePoint(cp));
    this.startIndex = index;
  }
  isVoidElement(name) {
    return !this.options.xmlMode && voidElements.has(name);
  }
  onopentagname(start, endIndex) {
    this.endIndex = endIndex;
    let name = this.getSlice(start, endIndex);
    if (this.lowerCaseTagNames) {
      name = name.toLowerCase();
    }
    this.emitOpenTag(name);
  }
  emitOpenTag(name) {
    var _a2, _b, _c, _d;
    this.openTagStart = this.startIndex;
    this.tagname = name;
    const impliesClose = !this.options.xmlMode && openImpliesClose.get(name);
    if (impliesClose) {
      while (this.stack.length > 0 && impliesClose.has(this.stack[this.stack.length - 1])) {
        const element = this.stack.pop();
        (_b = (_a2 = this.cbs).onclosetag) === null || _b === undefined || _b.call(_a2, element, true);
      }
    }
    if (!this.isVoidElement(name)) {
      this.stack.push(name);
      if (foreignContextElements.has(name)) {
        this.foreignContext.push(true);
      } else if (htmlIntegrationElements.has(name)) {
        this.foreignContext.push(false);
      }
    }
    (_d = (_c = this.cbs).onopentagname) === null || _d === undefined || _d.call(_c, name);
    if (this.cbs.onopentag)
      this.attribs = {};
  }
  endOpenTag(isImplied) {
    var _a2, _b;
    this.startIndex = this.openTagStart;
    if (this.attribs) {
      (_b = (_a2 = this.cbs).onopentag) === null || _b === undefined || _b.call(_a2, this.tagname, this.attribs, isImplied);
      this.attribs = null;
    }
    if (this.cbs.onclosetag && this.isVoidElement(this.tagname)) {
      this.cbs.onclosetag(this.tagname, true);
    }
    this.tagname = "";
  }
  onopentagend(endIndex) {
    this.endIndex = endIndex;
    this.endOpenTag(false);
    this.startIndex = endIndex + 1;
  }
  onclosetag(start, endIndex) {
    var _a2, _b, _c, _d, _e, _f;
    this.endIndex = endIndex;
    let name = this.getSlice(start, endIndex);
    if (this.lowerCaseTagNames) {
      name = name.toLowerCase();
    }
    if (foreignContextElements.has(name) || htmlIntegrationElements.has(name)) {
      this.foreignContext.pop();
    }
    if (!this.isVoidElement(name)) {
      const pos = this.stack.lastIndexOf(name);
      if (pos !== -1) {
        if (this.cbs.onclosetag) {
          let count = this.stack.length - pos;
          while (count--) {
            this.cbs.onclosetag(this.stack.pop(), count !== 0);
          }
        } else
          this.stack.length = pos;
      } else if (!this.options.xmlMode && name === "p") {
        this.emitOpenTag("p");
        this.closeCurrentTag(true);
      }
    } else if (!this.options.xmlMode && name === "br") {
      (_b = (_a2 = this.cbs).onopentagname) === null || _b === undefined || _b.call(_a2, "br");
      (_d = (_c = this.cbs).onopentag) === null || _d === undefined || _d.call(_c, "br", {}, true);
      (_f = (_e = this.cbs).onclosetag) === null || _f === undefined || _f.call(_e, "br", false);
    }
    this.startIndex = endIndex + 1;
  }
  onselfclosingtag(endIndex) {
    this.endIndex = endIndex;
    if (this.options.xmlMode || this.options.recognizeSelfClosing || this.foreignContext[this.foreignContext.length - 1]) {
      this.closeCurrentTag(false);
      this.startIndex = endIndex + 1;
    } else {
      this.onopentagend(endIndex);
    }
  }
  closeCurrentTag(isOpenImplied) {
    var _a2, _b;
    const name = this.tagname;
    this.endOpenTag(isOpenImplied);
    if (this.stack[this.stack.length - 1] === name) {
      (_b = (_a2 = this.cbs).onclosetag) === null || _b === undefined || _b.call(_a2, name, !isOpenImplied);
      this.stack.pop();
    }
  }
  onattribname(start, endIndex) {
    this.startIndex = start;
    const name = this.getSlice(start, endIndex);
    this.attribname = this.lowerCaseAttributeNames ? name.toLowerCase() : name;
  }
  onattribdata(start, endIndex) {
    this.attribvalue += this.getSlice(start, endIndex);
  }
  onattribentity(cp) {
    this.attribvalue += fromCodePoint(cp);
  }
  onattribend(quote, endIndex) {
    var _a2, _b;
    this.endIndex = endIndex;
    (_b = (_a2 = this.cbs).onattribute) === null || _b === undefined || _b.call(_a2, this.attribname, this.attribvalue, quote === QuoteType.Double ? '"' : quote === QuoteType.Single ? "'" : quote === QuoteType.NoValue ? undefined : null);
    if (this.attribs && !Object.prototype.hasOwnProperty.call(this.attribs, this.attribname)) {
      this.attribs[this.attribname] = this.attribvalue;
    }
    this.attribvalue = "";
  }
  getInstructionName(value2) {
    const index = value2.search(reNameEnd);
    let name = index < 0 ? value2 : value2.substr(0, index);
    if (this.lowerCaseTagNames) {
      name = name.toLowerCase();
    }
    return name;
  }
  ondeclaration(start, endIndex) {
    this.endIndex = endIndex;
    const value2 = this.getSlice(start, endIndex);
    if (this.cbs.onprocessinginstruction) {
      const name = this.getInstructionName(value2);
      this.cbs.onprocessinginstruction(`!${name}`, `!${value2}`);
    }
    this.startIndex = endIndex + 1;
  }
  onprocessinginstruction(start, endIndex) {
    this.endIndex = endIndex;
    const value2 = this.getSlice(start, endIndex);
    if (this.cbs.onprocessinginstruction) {
      const name = this.getInstructionName(value2);
      this.cbs.onprocessinginstruction(`?${name}`, `?${value2}`);
    }
    this.startIndex = endIndex + 1;
  }
  oncomment(start, endIndex, offset) {
    var _a2, _b, _c, _d;
    this.endIndex = endIndex;
    (_b = (_a2 = this.cbs).oncomment) === null || _b === undefined || _b.call(_a2, this.getSlice(start, endIndex - offset));
    (_d = (_c = this.cbs).oncommentend) === null || _d === undefined || _d.call(_c);
    this.startIndex = endIndex + 1;
  }
  oncdata(start, endIndex, offset) {
    var _a2, _b, _c, _d, _e, _f, _g, _h, _j, _k;
    this.endIndex = endIndex;
    const value2 = this.getSlice(start, endIndex - offset);
    if (this.options.xmlMode || this.options.recognizeCDATA) {
      (_b = (_a2 = this.cbs).oncdatastart) === null || _b === undefined || _b.call(_a2);
      (_d = (_c = this.cbs).ontext) === null || _d === undefined || _d.call(_c, value2);
      (_f = (_e = this.cbs).oncdataend) === null || _f === undefined || _f.call(_e);
    } else {
      (_h = (_g = this.cbs).oncomment) === null || _h === undefined || _h.call(_g, `[CDATA[${value2}]]`);
      (_k = (_j = this.cbs).oncommentend) === null || _k === undefined || _k.call(_j);
    }
    this.startIndex = endIndex + 1;
  }
  onend() {
    var _a2, _b;
    if (this.cbs.onclosetag) {
      this.endIndex = this.startIndex;
      for (let index = this.stack.length;index > 0; this.cbs.onclosetag(this.stack[--index], true))
        ;
    }
    (_b = (_a2 = this.cbs).onend) === null || _b === undefined || _b.call(_a2);
  }
  reset() {
    var _a2, _b, _c, _d;
    (_b = (_a2 = this.cbs).onreset) === null || _b === undefined || _b.call(_a2);
    this.tokenizer.reset();
    this.tagname = "";
    this.attribname = "";
    this.attribs = null;
    this.stack.length = 0;
    this.startIndex = 0;
    this.endIndex = 0;
    (_d = (_c = this.cbs).onparserinit) === null || _d === undefined || _d.call(_c, this);
    this.buffers.length = 0;
    this.bufferOffset = 0;
    this.writeIndex = 0;
    this.ended = false;
  }
  parseComplete(data) {
    this.reset();
    this.end(data);
  }
  getSlice(start, end) {
    while (start - this.bufferOffset >= this.buffers[0].length) {
      this.shiftBuffer();
    }
    let slice = this.buffers[0].slice(start - this.bufferOffset, end - this.bufferOffset);
    while (end - this.bufferOffset > this.buffers[0].length) {
      this.shiftBuffer();
      slice += this.buffers[0].slice(0, end - this.bufferOffset);
    }
    return slice;
  }
  shiftBuffer() {
    this.bufferOffset += this.buffers[0].length;
    this.writeIndex--;
    this.buffers.shift();
  }
  write(chunk) {
    var _a2, _b;
    if (this.ended) {
      (_b = (_a2 = this.cbs).onerror) === null || _b === undefined || _b.call(_a2, new Error(".write() after done!"));
      return;
    }
    this.buffers.push(chunk);
    if (this.tokenizer.running) {
      this.tokenizer.write(chunk);
      this.writeIndex++;
    }
  }
  end(chunk) {
    var _a2, _b;
    if (this.ended) {
      (_b = (_a2 = this.cbs).onerror) === null || _b === undefined || _b.call(_a2, new Error(".end() after done!"));
      return;
    }
    if (chunk)
      this.write(chunk);
    this.ended = true;
    this.tokenizer.end();
  }
  pause() {
    this.tokenizer.pause();
  }
  resume() {
    this.tokenizer.resume();
    while (this.tokenizer.running && this.writeIndex < this.buffers.length) {
      this.tokenizer.write(this.buffers[this.writeIndex++]);
    }
    if (this.ended)
      this.tokenizer.end();
  }
  parseChunk(chunk) {
    this.write(chunk);
  }
  done(chunk) {
    this.end(chunk);
  }
}
// src/search/engines/duckduckgo.ts
var USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36";
var DDG_HTML_URL = "https://html.duckduckgo.com/html/";
var vqdCache = new Map;
function makeDuckDuckGo(config) {
  return {
    name: config.name,
    config,
    search: (http, query, opts) => searchWithFallback(http, query, opts)
  };
}
function langToKl(lang) {
  if (!lang)
    return "wt-wt";
  const map8 = {
    "zh-CN": "cn-zh",
    "zh-TW": "tw-zh",
    zh: "cn-zh",
    ja: "jp-jp",
    ko: "kr-kr",
    en: "us-en",
    "en-US": "us-en",
    "en-GB": "uk-en",
    fr: "fr-fr",
    de: "de-de",
    es: "es-es",
    pt: "br-pt",
    it: "it-it",
    ru: "ru-ru"
  };
  return map8[lang] ?? map8[lang?.split("-")[0]] ?? "wt-wt";
}
function timeRangeToDf(timeRange) {
  if (!timeRange)
    return "";
  const map8 = {
    day: "d",
    week: "w",
    month: "m",
    year: "y"
  };
  return map8[timeRange] ?? "";
}
function searchWithFallback(http, query, opts) {
  const numResults = opts.numResults || 8;
  const safeHtml = searchHtmlPost(http, query, numResults, opts).pipe(exports_Effect.catchIf(() => true, () => exports_Effect.succeed([])));
  const safeJson = searchJsonApi(http, query, numResults).pipe(exports_Effect.catchIf(() => true, () => exports_Effect.succeed([])));
  const safeLite = searchLite(http, query, numResults).pipe(exports_Effect.catchIf(() => true, () => exports_Effect.succeed([])));
  return exports_Effect.gen(function* () {
    const [html, json2, lite] = yield* exports_Effect.all([safeHtml, safeJson, safeLite], { concurrency: "unbounded" });
    if (html.length > 0)
      return html;
    if (json2.length > 0)
      return json2;
    return lite;
  });
}
function searchHtmlPost(http, query, numResults, opts) {
  return exports_Effect.gen(function* () {
    const formData2 = new URLSearchParams({ q: query, b: "", kl: langToKl(opts.lang) });
    const df = timeRangeToDf(opts.timeRange);
    if (df)
      formData2.set("df", df);
    const response = yield* http.execute(exports_HttpClientRequest.post(DDG_HTML_URL).pipe(exports_HttpClientRequest.setHeaders({
      "User-Agent": USER_AGENT,
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": opts.lang ? `${opts.lang},en;q=0.9` : "en-US,en;q=0.9",
      "Sec-Fetch-Dest": "document",
      "Sec-Fetch-Mode": "navigate",
      "Sec-Fetch-Site": "same-origin",
      "Sec-Fetch-User": "?1",
      Referer: "https://html.duckduckgo.com/"
    }), exports_HttpClientRequest.bodyText(formData2.toString()))).pipe(exports_Effect.timeout("15 seconds"));
    if (response.status < 200 || response.status >= 400)
      return [];
    const html = yield* response.text;
    if (html.length < 500)
      return [];
    if (html.includes('id="challenge-form"') || html.includes('id="captcha"'))
      return [];
    if (response.status === 303 || response.status === 403)
      return [];
    const vqdMatch = html.match(/<input[^>]*name=["']vqd["'][^>]*value=["']([^"']+)["']/i);
    if (vqdMatch?.[1])
      vqdCache.set(`${query}//${USER_AGENT}`, { vqd: vqdMatch[1], expires: Date.now() + 3600000 });
    const results = parseHtmlResults(html, numResults);
    const suggestion = extractSuggestion(html);
    if (suggestion && results.length > 0) {
      const augmented = [...results];
      augmented[0] = makeSearchResult({ ...augmented[0], suggestion });
      return augmented;
    }
    return results;
  });
}
function extractSuggestion(html) {
  const showingMatch = html.match(/class=["'][^"']*spelling[^"']*["'][^>]*>.*?class=["'][^"']*result__suggestion[^"']*["'][^>]*>([^<]+)/i);
  if (showingMatch?.[1])
    return stripHtml(showingMatch[1]);
  const linkMatch = html.match(/class=["'][^"']*result__suggestion[^"']*["'][^>]*>([^<]+)/i);
  if (linkMatch?.[1])
    return stripHtml(linkMatch[1]);
  const didYouMean = html.match(/did\s+you\s+mean[:\s]+([^<.]+)/i);
  if (didYouMean?.[1])
    return stripHtml(didYouMean[1]);
  return;
}
function searchJsonApi(http, query, numResults) {
  return exports_Effect.gen(function* () {
    const response = yield* http.execute(exports_HttpClientRequest.get(`https://duckduckgo.com/?q=${encodeURIComponent(query)}`).pipe(exports_HttpClientRequest.setHeaders({
      "User-Agent": USER_AGENT,
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9"
    }))).pipe(exports_Effect.timeout("15 seconds"));
    if (response.status < 200 || response.status >= 400)
      return [];
    const html = yield* response.text;
    const vqd = html.match(/vqd\s*=\s*["']([^"']+)["']/)?.[1];
    if (!vqd)
      return [];
    const jsonUrl = new URL("https://links.duckduckgo.com/d.js");
    jsonUrl.searchParams.set("q", query);
    jsonUrl.searchParams.set("vqd", vqd);
    jsonUrl.searchParams.set("kl", "wt-wt");
    jsonUrl.searchParams.set("l", "wt-wt");
    jsonUrl.searchParams.set("o", "json");
    jsonUrl.searchParams.set("sp", "0");
    jsonUrl.searchParams.set("ex", "-1");
    const jsonResponse = yield* http.execute(exports_HttpClientRequest.get(jsonUrl.toString()).pipe(exports_HttpClientRequest.setHeaders({
      "User-Agent": USER_AGENT,
      Accept: "application/json, text/plain, */*",
      Referer: "https://duckduckgo.com/"
    }))).pipe(exports_Effect.timeout("15 seconds"));
    if (jsonResponse.status < 200 || jsonResponse.status >= 400)
      return [];
    const text2 = yield* jsonResponse.text;
    let data;
    try {
      data = JSON.parse(text2);
    } catch {
      return [];
    }
    const results = [];
    let pos = 0;
    for (const row of data?.results ?? []) {
      if (results.length >= numResults)
        break;
      const href = row.u;
      const title = stripHtml(row.t ?? "");
      if (!href || !title)
        continue;
      pos++;
      results.push(makeSearchResult({ title, url: extractUrl(href), snippet: stripHtml(row.a ?? ""), engine: "duckduckgo", position: pos }));
    }
    return results;
  });
}
function searchLite(http, query, numResults) {
  return exports_Effect.gen(function* () {
    const response = yield* http.execute(exports_HttpClientRequest.get(`https://lite.duckduckgo.com/lite/?q=${encodeURIComponent(query)}`).pipe(exports_HttpClientRequest.setHeaders({
      "User-Agent": USER_AGENT,
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9"
    }))).pipe(exports_Effect.timeout("15 seconds"));
    if (response.status < 200 || response.status >= 400)
      return [];
    const html = yield* response.text;
    return parseLiteResults(html, numResults);
  });
}
function extractUrl(href) {
  if (!href)
    return "";
  const uddgMatch = href.match(/[?&]uddg=([^&]+)/);
  if (uddgMatch) {
    try {
      return decodeURIComponent(uddgMatch[1]);
    } catch {}
  }
  if (href.startsWith("http://") || href.startsWith("https://"))
    return href;
  if (href.startsWith("//"))
    return `https:${href}`;
  return href;
}
function parseHtmlResults(html, maxResults) {
  const results = [];
  let current = {};
  let inResult = false, depth = 0, inTitle = false, inSnippet = false, inDate = false, inType = false, textBuf = "", pos = 0;
  const parser = new Parser({
    onopentag(name, attrs) {
      const cls = attrs.class ?? "";
      if (name === "div") {
        const classes = cls.split(/\s+/);
        if (classes.includes("result") && !classes.includes("results") && !inResult) {
          current = {};
          inResult = true;
          depth = 1;
          return;
        }
        if (inResult)
          depth++;
        return;
      }
      if (!inResult)
        return;
      if (name === "a" && cls === "result__a") {
        inTitle = true;
        textBuf = "";
        current.url = extractUrl(attrs.href ?? "");
      }
      if (name === "a" && cls === "result__snippet") {
        inSnippet = true;
        textBuf = "";
      }
      if ((name === "span" || name === "div") && (cls.includes("result__date") || cls.includes("result__timestamp") || cls.includes("result__extras__date"))) {
        inDate = true;
        textBuf = "";
      }
      if (name === "span" && (cls.includes("result__type") || cls.includes("result__badge"))) {
        inType = true;
        textBuf = "";
      }
    },
    ontext(text2) {
      if (inTitle || inSnippet || inDate || inType)
        textBuf += text2;
    },
    onclosetag(name) {
      if (!inResult)
        return;
      if (inDate && (name === "span" || name === "div")) {
        current.dateText = (current.dateText ?? "") + textBuf.trim();
        inDate = false;
        textBuf = "";
        return;
      }
      if (inType && name === "span") {
        current.type = (current.type ?? "") + textBuf.trim();
        inType = false;
        textBuf = "";
        return;
      }
      if (name === "div") {
        depth--;
        if (depth <= 0) {
          if (current.title && current.url) {
            pos++;
            const publishedDate = current.dateText ? parseRelativeDate(current.dateText) : undefined;
            results.push(makeSearchResult({
              title: current.title,
              url: current.url,
              snippet: current.snippet ?? "",
              engine: "duckduckgo",
              position: pos,
              publishedDate,
              category: current.type
            }));
            if (results.length >= maxResults) {
              parser.reset();
              return;
            }
          }
          current = {};
          inResult = false;
        }
        return;
      }
      if (name === "a") {
        if (inTitle) {
          current.title = (current.title ?? "") + textBuf.trim();
          inTitle = false;
        }
        if (inSnippet) {
          current.snippet = (current.snippet ?? "") + textBuf.trim();
          inSnippet = false;
        }
        textBuf = "";
      }
    }
  });
  parser.write(html);
  parser.end();
  if (inResult && current.title && current.url && results.length < maxResults) {
    pos++;
    const publishedDate = current.dateText ? parseRelativeDate(current.dateText) : undefined;
    results.push(makeSearchResult({
      title: current.title,
      url: current.url,
      snippet: current.snippet ?? "",
      engine: "duckduckgo",
      position: pos,
      publishedDate,
      category: current.type
    }));
  }
  return results;
}
function parseLiteResults(html, maxResults) {
  const results = [];
  const seen = new Set;
  let pos = 0;
  const tableRegex = /<tr[^>]*>[\s\S]*?<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<td[^>]*class="[^"]*snippet[^"]*"[^>]*>([\s\S]*?)<\/td>/gi;
  let m;
  while ((m = tableRegex.exec(html)) !== null) {
    if (results.length >= maxResults)
      break;
    const url = extractUrl(m[1]);
    if (!url || seen.has(url))
      continue;
    seen.add(url);
    pos++;
    results.push(makeSearchResult({ title: stripHtml(m[2]), url, snippet: stripHtml(m[3]), engine: "duckduckgo", position: pos }));
  }
  if (results.length > 0)
    return results;
  const divRegex = /<div[^>]*class="[^"]*\bresult\b[^"]*"[^>]*>[\s\S]*?<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<span[^>]*class="[^"]*snippet[^"]*"[^>]*>([\s\S]*?)<\/span>/gi;
  while ((m = divRegex.exec(html)) !== null) {
    if (results.length >= maxResults)
      break;
    const url = extractUrl(m[1]);
    if (!url || seen.has(url))
      continue;
    seen.add(url);
    pos++;
    results.push(makeSearchResult({ title: stripHtml(m[2]), url, snippet: stripHtml(m[3]), engine: "duckduckgo", position: pos }));
  }
  return results;
}

// src/search/engines/brave.ts
var BRAVE_API = "https://api.search.brave.com/res/v1/web/search";
function makeBrave(config) {
  const apiKey = process.env.BRAVE_API_KEY;
  return {
    name: config.name,
    config,
    search: (http, query, opts) => exports_Effect.gen(function* () {
      const params = new URLSearchParams({
        q: query,
        count: String(opts.numResults || config.maxResults),
        safesearch: String(opts.safesearch ?? 1)
      });
      const headers = {
        Accept: "application/json",
        "Accept-Encoding": "gzip"
      };
      if (apiKey)
        headers["X-Subscription-Token"] = apiKey;
      const response = yield* http.execute(exports_HttpClientRequest.get(`${BRAVE_API}?${params.toString()}`).pipe(exports_HttpClientRequest.setHeaders(headers))).pipe(exports_Effect.timeout(config.timeout));
      const status = response.status;
      if (status === 429 || status < 200 || status >= 400)
        return [];
      const text2 = yield* response.text;
      return parseBraveResults(text2);
    })
  };
}
function parseBraveResults(raw2) {
  let data;
  try {
    data = JSON.parse(raw2);
  } catch {
    return [];
  }
  const parsed = data;
  const webResults = parsed?.web?.results ?? parsed?.results ?? [];
  return webResults.map((r, i) => makeSearchResult({
    title: r.title ?? "",
    url: r.url ?? "",
    snippet: r.description ?? r.snippet ?? "",
    engine: "brave",
    position: i + 1,
    category: "general"
  }));
}

// src/search/engines/bing.ts
var BING_SEARCH_URL = "https://www.bing.com/search";
var BING_HOST = "https://www.bing.com";
var USER_AGENT2 = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36";
function makeBing(config) {
  return {
    name: config.name,
    config,
    search: (http, query, opts) => searchBing(http, query, opts.numResults || config.maxResults, config.timeout)
  };
}
function searchBing(http, query, numResults, timeout3) {
  return exports_Effect.gen(function* () {
    const url = `${BING_SEARCH_URL}?q=${encodeURIComponent(query)}&setlang=en`;
    const response = yield* http.execute(exports_HttpClientRequest.get(url).pipe(exports_HttpClientRequest.setHeaders({
      "User-Agent": USER_AGENT2,
      "Accept-Language": "en-US,en;q=0.9",
      Accept: "text/html,application/xhtml+xml"
    }))).pipe(exports_Effect.timeout(timeout3));
    if (response.status < 200 || response.status >= 400)
      return [];
    const html = yield* response.text;
    if (html.includes("captcha") || html.includes("verify"))
      return [];
    return parseBingResults(html, numResults);
  });
}
function decodeBingUrl(href) {
  if (!href.startsWith(`${BING_HOST}/ck/a?`) && !href.startsWith("/ck/a?")) {
    return href;
  }
  try {
    const qs = new URL(href, BING_HOST).searchParams;
    const u = qs.get("u");
    if (!u)
      return href;
    if (!u.startsWith("a1"))
      return href;
    const encoded = u.slice(2);
    const padded = encoded + "=".repeat((-encoded.length % 4 + 4) % 4);
    const decoded = atob(padded.replace(/-/g, "+").replace(/_/g, "/"));
    return decoded;
  } catch {
    return href;
  }
}
function extractResult(block) {
  const h2Match = block.match(/<h2[^>]*>[\s\S]*?<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<\/h2>/i);
  if (h2Match) {
    const url = decodeBingUrl(h2Match[1]);
    const title = h2Match[2].replace(/<[^>]*>/g, "").trim();
    if (title && url)
      return extractSnippet(block, title, url);
  }
  const tilkMatch = block.match(/<a[^>]*class="tilk"[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/i);
  if (tilkMatch) {
    const url = decodeBingUrl(tilkMatch[1]);
    const title = tilkMatch[2].replace(/<[^>]*>/g, "").trim();
    if (title && url)
      return extractSnippet(block, title, url);
  }
  return;
}
function extractSnippet(block, title, url) {
  const cleaned = block.replace(/<span[^>]*class="algoSlug_icon"[^>]*>[\s\S]*?<\/span>/gi, "");
  const pTags = [];
  const pRegex = /<p[^>]*>([\s\S]*?)<\/p>/gi;
  let pMatch;
  while ((pMatch = pRegex.exec(cleaned)) !== null) {
    const text2 = pMatch[1].replace(/<[^>]*>/g, "").trim();
    if (text2)
      pTags.push(text2);
  }
  return { title, url, snippet: pTags.join(" ").trim() };
}
function parseBingResults(html, maxResults) {
  const results = [];
  const seen = new Set;
  let pos = 0;
  const containerStart = html.indexOf('<ol id="b_results"');
  const searchHtml = containerStart === -1 ? html : html.slice(containerStart);
  const algoRegex = /<li[^>]*class="b_algo"[^>]*>[\s\S]*?<\/li>/gi;
  let match6;
  while ((match6 = algoRegex.exec(searchHtml)) !== null) {
    if (results.length >= maxResults)
      break;
    const extracted = extractResult(match6[0]);
    if (!extracted)
      continue;
    if (seen.has(extracted.url))
      continue;
    seen.add(extracted.url);
    pos++;
    results.push(makeSearchResult({
      title: extracted.title,
      url: extracted.url,
      snippet: extracted.snippet,
      engine: "bing",
      position: pos
    }));
  }
  return results;
}

// src/search/engines/bing-news.ts
var BING_NEWS_URL = "https://www.bing.com/news/infinitescrollajax";
var USER_AGENT3 = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36";
function makeBingNews(config) {
  return {
    name: config.name,
    config,
    search: (http, query, opts) => searchBingNews(http, query, opts, config.timeout, config.maxResults)
  };
}
function searchBingNews(http, query, opts, timeout3, maxResults) {
  return exports_Effect.gen(function* () {
    const params = new URLSearchParams({
      q: query,
      InfiniteScroll: "1",
      first: "1",
      SFX: "0",
      form: "PTFTNR"
    });
    const response = yield* http.execute(exports_HttpClientRequest.get(`${BING_NEWS_URL}?${params.toString()}`).pipe(exports_HttpClientRequest.setHeaders({
      "User-Agent": USER_AGENT3,
      "Accept-Language": "en-US,en;q=0.9",
      Accept: "text/html,application/xhtml+xml"
    }))).pipe(exports_Effect.timeout(timeout3));
    if (response.status < 200 || response.status >= 400)
      return [];
    const html = yield* response.text;
    return parseBingNewsResults(html, opts.numResults || maxResults);
  });
}
function parseBingNewsResults(html, maxResults) {
  const results = [];
  const seen = new Set;
  let pos = 0;
  const itemRegex = /<div[^>]*class="newsitem"[^>]*>[\s\S]*?<\/div>\s*<\/div>/gi;
  let match6;
  while ((match6 = itemRegex.exec(html)) !== null) {
    if (results.length >= maxResults)
      break;
    const block = match6[0];
    const titleMatch = block.match(/<a[^>]*class="title"[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/i);
    if (!titleMatch)
      continue;
    const url = titleMatch[1];
    const title = titleMatch[2].replace(/<[^>]*>/g, "").trim();
    if (!title || !url || seen.has(url))
      continue;
    seen.add(url);
    const snippetMatch = block.match(/<div[^>]*class="snippet"[^>]*>([\s\S]*?)<\/div>/i);
    const snippet = snippetMatch?.[1]?.replace(/<[^>]*>/g, "").trim() ?? "";
    const sourceMatch = block.match(/<span[^>]*aria-label="([^"]*)"[^>]*>([\s\S]*?)<\/span>/i);
    const source = sourceMatch?.[1] ?? "";
    pos++;
    results.push(makeSearchResult({
      title,
      url,
      snippet: source ? `[${source}] ${snippet}` : snippet,
      engine: "bing-news",
      position: pos,
      category: "news"
    }));
  }
  return results;
}

// src/search/engines/bilibili.ts
var API_URL = "https://api.bilibili.com/x/web-interface/search/type";
var USER_AGENT4 = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36";
function generateBuvid3() {
  const hex = "0123456789abcdefABCDEF";
  let result3 = "";
  for (let i = 0;i < 16; i++) {
    result3 += hex[Math.floor(Math.random() * hex.length)];
  }
  return result3 + "infoc";
}
function sanitizeTitle(text2) {
  const decoded = text2.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#x27;/g, "'").replace(/&#x2F;/g, "/").replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(parseInt(n, 10)));
  return decoded.replace(/<[^>]*>/g, "").trim();
}
function makeBilibili(config) {
  return {
    name: config.name,
    config,
    search: (http, query, opts) => searchBilibili(http, query, opts.numResults || config.maxResults, config.timeout)
  };
}
function searchBilibili(http, query, numResults, timeout3) {
  return exports_Effect.gen(function* () {
    const params = new URLSearchParams({
      keyword: query,
      search_type: "video",
      page: "1",
      page_size: String(Math.min(numResults, 50)),
      single_column: "0",
      __refresh__: "true",
      platform: "web"
    });
    const url = `${API_URL}?${params.toString()}`;
    const buvid3 = generateBuvid3();
    const cookies = [
      `buvid3=${buvid3}`,
      "innersign=0",
      "i-wanna-go-back=-1",
      "b_ut=7",
      "FEED_LIVE_VERSION=V8",
      "header_theme_version=undefined",
      "home_feed_column=4"
    ];
    const response = yield* http.execute(exports_HttpClientRequest.get(url).pipe(exports_HttpClientRequest.setHeaders({
      "User-Agent": USER_AGENT4,
      Referer: "https://www.bilibili.com/",
      Accept: "application/json, text/javascript, */*; q=0.01",
      "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
      Cookie: cookies.join("; ")
    }))).pipe(exports_Effect.timeout(timeout3));
    if (response.status < 200 || response.status >= 400)
      return [];
    if (response.status === 412)
      return [];
    const raw2 = yield* response.text;
    if (!raw2)
      return [];
    return parseBilibiliResults(raw2, numResults);
  });
}
function parseBilibiliResults(raw2, maxResults) {
  const results = [];
  let parsed;
  try {
    parsed = JSON.parse(raw2);
  } catch {
    return [];
  }
  const items = parsed?.data?.result;
  if (!items || !Array.isArray(items))
    return [];
  let pos = 0;
  for (const item of items) {
    if (results.length >= maxResults)
      break;
    if (typeof item !== "object" || !item)
      continue;
    const record2 = item;
    const title = typeof record2.title === "string" ? sanitizeTitle(record2.title) : "";
    const url = typeof record2.arcurl === "string" ? record2.arcurl : "";
    const description = typeof record2.description === "string" ? record2.description.trim() : "";
    const pubdate = typeof record2.pubdate === "number" ? record2.pubdate : undefined;
    if (!title || !url)
      continue;
    pos++;
    results.push(makeSearchResult({
      title,
      url,
      snippet: description.slice(0, 300),
      engine: "bilibili",
      position: pos,
      publishedDate: pubdate ? pubdate * 1000 : undefined,
      category: "video"
    }));
  }
  return results;
}

// src/search/engines/sogou-wechat.ts
var BASE_URL = "https://weixin.sogou.com";
var SEARCH_URL = `${BASE_URL}/weixin`;
var USER_AGENT5 = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36";
function makeSogouWeChat(config) {
  return {
    name: config.name,
    config,
    search: (http, query, opts) => searchSogouWeChat(http, query, opts.numResults || config.maxResults, config.timeout)
  };
}
function searchSogouWeChat(http, query, numResults, timeout3) {
  return exports_Effect.gen(function* () {
    const params = new URLSearchParams({
      query,
      type: "2",
      page: "1"
    });
    const response = yield* http.execute(exports_HttpClientRequest.get(`${SEARCH_URL}?${params.toString()}`).pipe(exports_HttpClientRequest.setHeaders({
      "User-Agent": USER_AGENT5,
      Accept: "text/html,application/xhtml+xml",
      "Accept-Language": "zh-CN,zh;q=0.9",
      Referer: BASE_URL
    }))).pipe(exports_Effect.timeout(timeout3));
    if (response.status < 200 || response.status >= 400)
      return [];
    const html = yield* response.text;
    if (!html || html.includes("antispider"))
      return [];
    return parseSogouWeChatResults(html, numResults);
  });
}
function parseSogouWeChatResults(html, maxResults) {
  const results = [];
  let pos = 0;
  const itemRegex = /<li[^>]*id="sogou_vr_[\d_]+"[^>]*>[\s\S]*?<\/li>/gi;
  let match6;
  while ((match6 = itemRegex.exec(html)) !== null) {
    if (results.length >= maxResults)
      break;
    const block = match6[0];
    const titleMatch = block.match(/<h3>[\s\S]*?<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/i);
    if (!titleMatch)
      continue;
    let url = titleMatch[1];
    const title = titleMatch[2].replace(/<[^>]*>/g, "").trim();
    if (!title || !url)
      continue;
    if (url.startsWith("/link?url="))
      url = `${BASE_URL}${url}`;
    else if (url.startsWith("//"))
      url = `https:${url}`;
    let snippet = "";
    const snippetMatch = block.match(/<p[^>]*class="txt-info"[^>]*>([\s\S]*?)<\/p>/i);
    if (snippetMatch)
      snippet = snippetMatch[1].replace(/<[^>]*>/g, "").trim();
    let publishedDate;
    const timeMatch = block.match(/timeConvert\('(\d+)'\)/);
    if (timeMatch) {
      const ts = parseInt(timeMatch[1], 10);
      if (!isNaN(ts))
        publishedDate = ts * 1000;
    }
    const accountMatch = block.match(/<div[^>]*class="account"[^>]*>([\s\S]*?)<\/div>/i);
    const account = accountMatch ? accountMatch[1].replace(/<[^>]*>/g, "").trim() : "";
    pos++;
    results.push(makeSearchResult({
      title,
      url,
      snippet: snippet || account,
      engine: "sogou-wechat",
      position: pos,
      publishedDate,
      category: "news"
    }));
  }
  return results;
}

// src/search/engines/baidu.ts
var SEARCH_URL2 = "https://www.baidu.com/s";
var USER_AGENT6 = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36";
function makeBaidu(config) {
  return {
    name: config.name,
    config,
    search: (http, query, opts) => searchBaidu(http, query, opts.numResults || config.maxResults, config.timeout)
  };
}
function searchBaidu(http, query, numResults, timeout3) {
  return exports_Effect.gen(function* () {
    const params = new URLSearchParams({
      wd: query,
      rn: String(Math.min(numResults, 50)),
      pn: "0",
      tn: "json"
    });
    const response = yield* http.execute(exports_HttpClientRequest.get(`${SEARCH_URL2}?${params.toString()}`).pipe(exports_HttpClientRequest.setHeaders({
      "User-Agent": USER_AGENT6,
      Accept: "application/json, text/javascript, */*; q=0.01",
      "Accept-Language": "zh-CN,zh;q=0.9",
      Referer: "https://www.baidu.com/"
    }))).pipe(exports_Effect.timeout(timeout3));
    if (response.status < 200 || response.status >= 400)
      return [];
    if (response.status === 302 || response.status === 303)
      return [];
    const raw2 = yield* response.text;
    if (!raw2 || raw2.includes("wappass") || raw2.includes("captcha"))
      return [];
    return parseBaiduResults(raw2, numResults);
  });
}
function parseBaiduResults(raw2, maxResults) {
  const results = [];
  let parsed;
  try {
    parsed = JSON.parse(raw2);
  } catch {
    return [];
  }
  const entries = parsed?.feed?.entry;
  if (!entries || !Array.isArray(entries))
    return [];
  let pos = 0;
  for (const entry of entries) {
    if (results.length >= maxResults)
      break;
    if (typeof entry !== "object" || !entry)
      continue;
    const record2 = entry;
    const title = typeof record2.title === "string" ? unescapeHtml(record2.title).trim() : "";
    const url = typeof record2.url === "string" ? record2.url : "";
    const snippet = typeof record2.abs === "string" ? unescapeHtml(record2.abs).trim() : "";
    const time = typeof record2.time === "number" ? record2.time : undefined;
    if (!title || !url)
      continue;
    pos++;
    results.push(makeSearchResult({
      title,
      url,
      snippet: snippet.slice(0, 300),
      engine: "baidu",
      position: pos,
      publishedDate: time ? time * 1000 : undefined
    }));
  }
  return results;
}
function unescapeHtml(text2) {
  return text2.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#x27;/g, "'").replace(/&#x2F;/g, "/").replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(parseInt(n, 10)));
}

// src/search/engines/wikipedia.ts
var API_URL2 = "https://en.wikipedia.org/w/api.php";
var USER_AGENT7 = "opencode-search/1.0 (metasearch engine)";
function makeWikipedia(config) {
  return {
    name: config.name,
    config,
    search: (http, query, opts) => searchWikipedia(http, query, opts.numResults || config.maxResults, config.timeout)
  };
}
function searchWikipedia(http, query, numResults, timeout3) {
  return exports_Effect.gen(function* () {
    const params = new URLSearchParams({
      action: "query",
      list: "search",
      srsearch: query,
      srlimit: String(Math.min(numResults, 50)),
      format: "json",
      origin: "*"
    });
    const response = yield* http.execute(exports_HttpClientRequest.get(`${API_URL2}?${params.toString()}`).pipe(exports_HttpClientRequest.setHeaders({
      "User-Agent": USER_AGENT7,
      Accept: "application/json"
    }))).pipe(exports_Effect.timeout(timeout3));
    if (response.status < 200 || response.status >= 400)
      return [];
    const raw2 = yield* response.text;
    if (!raw2)
      return [];
    return parseWikipediaResults(raw2, numResults);
  });
}
function parseWikipediaResults(raw2, maxResults) {
  const results = [];
  let parsed;
  try {
    parsed = JSON.parse(raw2);
  } catch {
    return [];
  }
  const searchResults = parsed?.query?.search;
  if (!searchResults || !Array.isArray(searchResults))
    return [];
  let pos = 0;
  for (const item of searchResults) {
    if (results.length >= maxResults)
      break;
    const title = item.title?.trim();
    const pageid = item.pageid;
    const snippet = item.snippet?.replace(/<[^>]*>/g, "").trim() || "";
    const timestamp = item.timestamp;
    if (!title || !pageid)
      continue;
    pos++;
    results.push(makeSearchResult({
      title,
      url: `https://en.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, "_"))}`,
      snippet: snippet.slice(0, 300),
      engine: "wikipedia",
      position: pos,
      publishedDate: timestamp ? new Date(timestamp).getTime() : undefined,
      category: "encyclopedia"
    }));
  }
  return results;
}

// src/search/engines/arxiv.ts
var API_URL3 = "http://export.arxiv.org/api/query";
var USER_AGENT8 = "opencode-search/1.0 (metasearch engine)";
function makeArxiv(config) {
  return {
    name: config.name,
    config,
    search: (http, query, opts) => searchArxiv(http, query, opts.numResults || config.maxResults, config.timeout)
  };
}
function searchArxiv(http, query, numResults, timeout3) {
  return exports_Effect.gen(function* () {
    const params = new URLSearchParams({
      search_query: `all:${query}`,
      max_results: String(Math.min(numResults, 50)),
      sortBy: "relevance",
      sortOrder: "descending"
    });
    const response = yield* http.execute(exports_HttpClientRequest.get(`${API_URL3}?${params.toString()}`).pipe(exports_HttpClientRequest.setHeaders({
      "User-Agent": USER_AGENT8,
      Accept: "application/xml, text/xml"
    }))).pipe(exports_Effect.timeout(timeout3));
    if (response.status < 200 || response.status >= 400)
      return [];
    const raw2 = yield* response.text;
    if (!raw2)
      return [];
    return parseArxivResults(raw2, numResults);
  });
}
function parseArxivResults(raw2, maxResults) {
  const results = [];
  const entryRegex = /<entry>[\s\S]*?<\/entry>/gi;
  let entryMatch;
  let pos = 0;
  while ((entryMatch = entryRegex.exec(raw2)) !== null) {
    if (results.length >= maxResults)
      break;
    const entry = entryMatch[0];
    const title = extractXmlValue(entry, "title");
    const id = extractXmlValue(entry, "id");
    const summary = extractXmlValue(entry, "summary");
    const published = extractXmlValue(entry, "published");
    const author = extractXmlValue(entry, "name");
    if (!title || !id)
      continue;
    const url = id.replace("http://", "https://");
    pos++;
    results.push(makeSearchResult({
      title: title.trim(),
      url,
      snippet: (author ? `${author}: ` : "") + (summary ? summary.replace(/<[^>]*>/g, "").trim().slice(0, 250) : ""),
      engine: "arxiv",
      position: pos,
      publishedDate: published ? new Date(published).getTime() : undefined,
      category: "academic"
    }));
  }
  return results;
}
function extractXmlValue(xml, tag2) {
  const match6 = xml.match(new RegExp(`<${tag2}[^>]*>([\\s\\S]*?)<\\/${tag2}>`, "i"));
  return match6 ? match6[1].trim() : undefined;
}

// src/search/engines/semantic-scholar.ts
var API_URL4 = "https://api.semanticscholar.org/graph/v1/paper/search";
var USER_AGENT9 = "opencode-search/1.0 (metasearch engine)";
function makeSemanticScholar(config) {
  return {
    name: config.name,
    config,
    search: (http, query, opts) => searchSemanticScholar(http, query, opts.numResults || config.maxResults, config.timeout)
  };
}
function searchSemanticScholar(http, query, numResults, timeout3) {
  return exports_Effect.gen(function* () {
    const params = new URLSearchParams({
      query,
      limit: String(Math.min(numResults, 50)),
      fields: "title,url,publicationDate,authors,abstract,externalIds"
    });
    const response = yield* http.execute(exports_HttpClientRequest.get(`${API_URL4}?${params.toString()}`).pipe(exports_HttpClientRequest.setHeaders({
      "User-Agent": USER_AGENT9,
      Accept: "application/json"
    }))).pipe(exports_Effect.timeout(timeout3));
    if (response.status < 200 || response.status >= 400)
      return [];
    if (response.status === 429)
      return [];
    const raw2 = yield* response.text;
    if (!raw2)
      return [];
    return parseSemanticScholarResults(raw2, numResults);
  });
}
function parseSemanticScholarResults(raw2, maxResults) {
  const results = [];
  let parsed;
  try {
    parsed = JSON.parse(raw2);
  } catch {
    return [];
  }
  const papers = parsed?.data;
  if (!papers || !Array.isArray(papers))
    return [];
  let pos = 0;
  for (const paper of papers) {
    if (results.length >= maxResults)
      break;
    if (!paper)
      continue;
    const title = paper.title?.trim();
    const url = paper.url || (paper.externalIds?.ArXiv ? `https://arxiv.org/abs/${paper.externalIds.ArXiv}` : "");
    const abstract = paper.abstract?.trim() || "";
    const date = paper.publicationDate;
    const author = paper.authors?.map((a) => a.name).join(", ") || "";
    if (!title || !url)
      continue;
    pos++;
    results.push(makeSearchResult({
      title,
      url,
      snippet: author ? `${author} - ${abstract.slice(0, 200)}` : abstract.slice(0, 250),
      engine: "semantic-scholar",
      position: pos,
      publishedDate: date ? new Date(date).getTime() : undefined,
      category: "academic"
    }));
  }
  return results;
}

// src/search/engines/github.ts
var API_URL5 = "https://api.github.com/search/repositories";
var USER_AGENT10 = "opencode-search/1.0";
function makeGitHub(config) {
  return {
    name: config.name,
    config,
    search: (http, query, opts) => searchGitHub(http, query, opts.numResults || config.maxResults, config.timeout)
  };
}
function searchGitHub(http, query, numResults, timeout3) {
  return exports_Effect.gen(function* () {
    const params = new URLSearchParams({
      q: query,
      per_page: String(Math.min(numResults, 50)),
      sort: "stars",
      order: "desc"
    });
    const headers = {
      "User-Agent": USER_AGENT10,
      Accept: "application/vnd.github.v3+json"
    };
    const token = process.env.GITHUB_TOKEN;
    if (token)
      headers["Authorization"] = `Bearer ${token}`;
    const response = yield* http.execute(exports_HttpClientRequest.get(`${API_URL5}?${params.toString()}`).pipe(exports_HttpClientRequest.setHeaders(headers))).pipe(exports_Effect.timeout(timeout3));
    if (response.status < 200 || response.status >= 400)
      return [];
    const raw2 = yield* response.text;
    if (!raw2)
      return [];
    return parseGitHubResults(raw2, numResults);
  });
}
function parseGitHubResults(raw2, maxResults) {
  const results = [];
  let parsed;
  try {
    parsed = JSON.parse(raw2);
  } catch {
    return [];
  }
  const items = parsed?.items;
  if (!items || !Array.isArray(items))
    return [];
  let pos = 0;
  for (const item of items) {
    if (results.length >= maxResults)
      break;
    const name = item.full_name;
    const url = item.html_url;
    const desc = item.description?.trim() || "";
    const stars = item.stargazers_count ?? 0;
    const lang = item.language || "";
    const updated = item.updated_at;
    if (!name || !url)
      continue;
    pos++;
    results.push(makeSearchResult({
      title: `${name} ⭐${stars}`,
      url,
      snippet: lang ? `[${lang}] ${desc.slice(0, 250)}` : desc.slice(0, 250),
      engine: "github",
      position: pos,
      publishedDate: updated ? new Date(updated).getTime() : undefined,
      category: "code"
    }));
  }
  return results;
}

// src/search/engines/github-code.ts
var API_BASE = "https://api.github.com";
var USER_AGENT11 = "opencode-search/1.0";
function makeGitHubCode(config) {
  return {
    name: config.name,
    config,
    search: (http, query, opts) => searchGitHubCode(http, query, opts.numResults || config.maxResults, config.timeout)
  };
}
function searchGitHubCode(http, query, numResults, timeout3) {
  return exports_Effect.gen(function* () {
    const params = new URLSearchParams({
      q: query,
      per_page: String(Math.min(numResults, 50)),
      sort: "indexed",
      order: "desc"
    });
    const headers = {
      "User-Agent": USER_AGENT11,
      Accept: "application/vnd.github.v3.text-match+json"
    };
    const token = process.env.GITHUB_TOKEN;
    if (token)
      headers["Authorization"] = `Bearer ${token}`;
    const response = yield* http.execute(exports_HttpClientRequest.get(`${API_BASE}/search/code?${params.toString()}`).pipe(exports_HttpClientRequest.setHeaders(headers))).pipe(exports_Effect.timeout(timeout3));
    if (response.status < 200 || response.status >= 400)
      return [];
    const raw2 = yield* response.text;
    if (!raw2)
      return [];
    return parseGitHubCodeResults(raw2, numResults);
  });
}
function parseGitHubCodeResults(raw2, maxResults) {
  let parsed;
  try {
    parsed = JSON.parse(raw2);
  } catch {
    return [];
  }
  const items = parsed?.items;
  if (!Array.isArray(items))
    return [];
  const results = [];
  let pos = 0;
  for (const item of items) {
    if (results.length >= maxResults)
      break;
    const repoName = item.repository?.full_name || "";
    const filePath = item.path || "";
    const fileUrl = item.html_url || "";
    const lang = item.language || "";
    const repoUrl = item.repository?.html_url || "";
    if (!repoName || !filePath)
      continue;
    const fragments = item.text_matches?.map((m) => m.fragment || "").filter(Boolean) ?? [];
    const snippet = fragments.length > 0 ? fragments.join(`
...
`).slice(0, 400) : `File in ${repoName}`;
    const title = `${repoName}: ${filePath}`;
    const url = fileUrl;
    pos++;
    results.push(makeSearchResult({
      title,
      url,
      snippet: lang ? `[${lang}] ${snippet}` : snippet,
      engine: "github-code",
      position: pos,
      category: "code"
    }));
  }
  return results;
}

// src/search/engines/mdn.ts
var SEARCH_URL3 = "https://developer.mozilla.org/en-US/search";
var USER_AGENT12 = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36";
function makeMDN(config) {
  return {
    name: config.name,
    config,
    search: (http, query, opts) => searchMDN(http, query, opts.numResults || config.maxResults, config.timeout)
  };
}
function searchMDN(http, query, numResults, timeout3) {
  return exports_Effect.gen(function* () {
    const params = new URLSearchParams({
      q: query
    });
    const response = yield* http.execute(exports_HttpClientRequest.get(`${SEARCH_URL3}?${params.toString()}`).pipe(exports_HttpClientRequest.setHeaders({
      "User-Agent": USER_AGENT12,
      Accept: "text/html,application/xhtml+xml",
      "Accept-Language": "en-US,en;q=0.9"
    }))).pipe(exports_Effect.timeout(timeout3));
    if (response.status < 200 || response.status >= 400)
      return [];
    const html = yield* response.text;
    if (!html)
      return [];
    return parseMDNResults(html, numResults);
  });
}
function parseMDNResults(html, maxResults) {
  const results = [];
  let pos = 0;
  const itemRegex = /<div[^>]*class="result-item"[^>]*>[\s\S]*?<a[^>]*class="result-item-link"[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<p[^>]*class="result-item-summary"[^>]*>([\s\S]*?)<\/p>/gi;
  let match6;
  while ((match6 = itemRegex.exec(html)) !== null) {
    if (results.length >= maxResults)
      break;
    let url = match6[1].trim();
    const title = match6[2].replace(/<[^>]+>/g, "").trim();
    const snippet = match6[3]?.replace(/<[^>]+>/g, "").trim() || "";
    if (!title || !url)
      continue;
    if (url.startsWith("/"))
      url = `https://developer.mozilla.org${url}`;
    pos++;
    results.push(makeSearchResult({
      title,
      url,
      snippet: snippet.slice(0, 300),
      engine: "mdn",
      position: pos,
      category: "general"
    }));
  }
  return results;
}

// src/search/engines/docsrs.ts
var SEARCH_URL4 = "https://docs.rs/releases/search";
var USER_AGENT13 = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36";
function makeDocsRs(config) {
  return {
    name: config.name,
    config,
    search: (http, query, opts) => searchDocsRs(http, query, opts.numResults || config.maxResults, config.timeout)
  };
}
function searchDocsRs(http, query, numResults, timeout3) {
  return exports_Effect.gen(function* () {
    const params = new URLSearchParams({ query });
    const response = yield* http.execute(exports_HttpClientRequest.get(`${SEARCH_URL4}?${params.toString()}`).pipe(exports_HttpClientRequest.setHeaders({
      "User-Agent": USER_AGENT13,
      Accept: "text/html"
    }))).pipe(exports_Effect.timeout(timeout3));
    if (response.status < 200 || response.status >= 400)
      return [];
    const html = yield* response.text;
    if (!html)
      return [];
    return parseDocsRsResults(html, numResults);
  });
}
function parseDocsRsResults(html, maxResults) {
  const results = [];
  let pos = 0;
  const itemRegex = /<li[^>]*class="release"[^>]*>[\s\S]*?<a[^>]*class="release-name"[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?(?:<span[^>]*class="release-description"[^>]*>([\s\S]*?)<\/span>)?/gi;
  let match6;
  while ((match6 = itemRegex.exec(html)) !== null) {
    if (results.length >= maxResults)
      break;
    const href = match6[1].trim();
    const name = match6[2].replace(/<[^>]+>/g, "").trim();
    const description = match6[3]?.replace(/<[^>]+>/g, "").trim() || "";
    if (!name || !href)
      continue;
    const url = href.startsWith("http") ? href : `https://docs.rs${href}`;
    pos++;
    results.push(makeSearchResult({
      title: name,
      url,
      snippet: description || "Rust crate documentation",
      engine: "docsrs",
      position: pos,
      category: "code"
    }));
  }
  return results;
}

// src/search/engines/react-docs.ts
var SEARCH_URL5 = "https://react.dev/search";
var USER_AGENT14 = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36";
function makeReactDocs(config) {
  return {
    name: config.name,
    config,
    search: (http, query, opts) => searchReactDocs(http, query, opts.numResults || config.maxResults, config.timeout)
  };
}
function searchReactDocs(http, query, numResults, timeout3) {
  return exports_Effect.gen(function* () {
    const params = new URLSearchParams({ q: query });
    const response = yield* http.execute(exports_HttpClientRequest.get(`${SEARCH_URL5}?${params.toString()}`).pipe(exports_HttpClientRequest.setHeaders({
      "User-Agent": USER_AGENT14,
      Accept: "text/html"
    }))).pipe(exports_Effect.timeout(timeout3));
    if (response.status < 200 || response.status >= 400)
      return [];
    const html = yield* response.text;
    if (!html)
      return [];
    return parseReactDocsResults(html, numResults);
  });
}
function parseReactDocsResults(html, maxResults) {
  const results = [];
  let pos = 0;
  const jsonMatch = html.match(/window\.__NEXT_DATA__\s*=\s*(\{[\s\S]*?\});/);
  if (jsonMatch) {
    try {
      const data = JSON.parse(jsonMatch[1]);
      const searchResults = data?.props?.pageProps?.searchResults;
      if (Array.isArray(searchResults)) {
        for (const item of searchResults) {
          if (results.length >= maxResults)
            break;
          const title = item.title || item._highlightResult?.title?.value?.replace(/<[^>]+>/g, "") || "";
          const url = item.url || `https://react.dev${item.path || ""}`;
          const snippet = item._highlightResult?.content?.value?.replace(/<[^>]+>/g, "") || item.content || "";
          if (!title)
            continue;
          pos++;
          results.push(makeSearchResult({ title, url, snippet: snippet.slice(0, 300), engine: "react-docs", position: pos, category: "general" }));
        }
        return results;
      }
    } catch {}
  }
  const itemRegex = /<a[^>]*class="[^"]*search-result[^"]*"[^>]*href="([^"]*)"[^>]*>[\s\S]*?<span[^>]*class="[^"]*title[^"]*"[^>]*>([\s\S]*?)<\/span>[\s\S]*?<span[^>]*class="[^"]*snippet[^"]*"[^>]*>([\s\S]*?)<\/span>/gi;
  let match6;
  while ((match6 = itemRegex.exec(html)) !== null) {
    if (results.length >= maxResults)
      break;
    const url = match6[1].startsWith("/") ? `https://react.dev${match6[1]}` : match6[1];
    const title = match6[2].replace(/<[^>]+>/g, "").trim();
    const snippet = match6[3]?.replace(/<[^>]+>/g, "").trim() || "";
    if (!title || !url)
      continue;
    pos++;
    results.push(makeSearchResult({ title, url, snippet: snippet.slice(0, 300), engine: "react-docs", position: pos, category: "general" }));
  }
  return results;
}

// src/search/engines/vue-docs.ts
var SEARCH_URL6 = "https://vuejs.org/search";
var USER_AGENT15 = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36";
function makeVueDocs(config) {
  return {
    name: config.name,
    config,
    search: (http, query, opts) => searchVueDocs(http, query, opts.numResults || config.maxResults, config.timeout)
  };
}
function searchVueDocs(http, query, numResults, timeout3) {
  return exports_Effect.gen(function* () {
    const params = new URLSearchParams({ q: query });
    const response = yield* http.execute(exports_HttpClientRequest.get(`${SEARCH_URL6}?${params.toString()}`).pipe(exports_HttpClientRequest.setHeaders({
      "User-Agent": USER_AGENT15,
      Accept: "text/html"
    }))).pipe(exports_Effect.timeout(timeout3));
    if (response.status < 200 || response.status >= 400)
      return [];
    const html = yield* response.text;
    if (!html)
      return [];
    return parseVueDocsResults(html, numResults);
  });
}
function parseVueDocsResults(html, maxResults) {
  const results = [];
  let pos = 0;
  const itemRegex = /<a[^>]*class="[^"]*search-result[^"]*"[^>]*href="([^"]*)"[^>]*>[\s\S]*?<span[^>]*class="[^"]*title[^"]*"[^>]*>([\s\S]*?)<\/span>[\s\S]*?<p[^>]*class="[^"]*excerpt[^"]*"[^>]*>([\s\S]*?)<\/p>/gi;
  let match6;
  while ((match6 = itemRegex.exec(html)) !== null) {
    if (results.length >= maxResults)
      break;
    const url = match6[1].startsWith("/") ? `https://vuejs.org${match6[1]}` : match6[1];
    const title = match6[2].replace(/<[^>]+>/g, "").trim();
    const snippet = match6[3]?.replace(/<[^>]+>/g, "").trim() || "";
    if (!title || !url)
      continue;
    pos++;
    results.push(makeSearchResult({ title, url, snippet: snippet.slice(0, 300), engine: "vue-docs", position: pos, category: "general" }));
  }
  return results;
}

// src/search/engines/python-docs.ts
var SEARCH_URL7 = "https://docs.python.org/3/search.html";
var USER_AGENT16 = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36";
function makePythonDocs(config) {
  return {
    name: config.name,
    config,
    search: (http, query, opts) => searchPythonDocs(http, query, opts.numResults || config.maxResults, config.timeout)
  };
}
function searchPythonDocs(http, query, numResults, timeout3) {
  return exports_Effect.gen(function* () {
    const params = new URLSearchParams({ q: query });
    const response = yield* http.execute(exports_HttpClientRequest.get(`${SEARCH_URL7}?${params.toString()}`).pipe(exports_HttpClientRequest.setHeaders({
      "User-Agent": USER_AGENT16,
      Accept: "text/html",
      "Accept-Language": "en-US,en;q=0.9"
    }))).pipe(exports_Effect.timeout(timeout3));
    if (response.status < 200 || response.status >= 400)
      return [];
    const html = yield* response.text;
    if (!html)
      return [];
    return parsePythonDocsResults(html, numResults);
  });
}
function parsePythonDocsResults(html, maxResults) {
  const results = [];
  let pos = 0;
  const itemRegex = /<li[^>]*class="search-result"[^>]*>[\s\S]*?<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?(?:<span[^>]*class="description"[^>]*>([\s\S]*?)<\/span>)?/gi;
  let match6;
  while ((match6 = itemRegex.exec(html)) !== null) {
    if (results.length >= maxResults)
      break;
    let url = match6[1].trim();
    const title = match6[2].replace(/<[^>]+>/g, "").trim();
    const snippet = match6[3]?.replace(/<[^>]+>/g, "").trim() || "";
    if (!title || !url)
      continue;
    if (url.startsWith("/"))
      url = `https://docs.python.org${url}`;
    const cleanTitle = title.replace(/^\d+\.\d+(\.\d+[a-z]?\d*)?\s+/, "").trim();
    pos++;
    results.push(makeSearchResult({ title: cleanTitle, url, snippet: snippet.slice(0, 300), engine: "python-docs", position: pos, category: "general" }));
  }
  return results;
}

// src/search/engines/github-issues.ts
var API_BASE2 = "https://api.github.com";
var USER_AGENT17 = "opencode-search/1.0";
function makeGitHubIssues(config) {
  return {
    name: config.name,
    config,
    search: (http, query, opts) => searchGitHubIssues(http, query, opts.numResults || config.maxResults, config.timeout)
  };
}
function searchGitHubIssues(http, query, numResults, timeout3) {
  return exports_Effect.gen(function* () {
    const params = new URLSearchParams({
      q: query,
      per_page: String(Math.min(numResults, 50)),
      sort: "relevance",
      order: "desc"
    });
    const headers = {
      "User-Agent": USER_AGENT17,
      Accept: "application/vnd.github.v3+json"
    };
    const token = process.env.GITHUB_TOKEN;
    if (token)
      headers["Authorization"] = `Bearer ${token}`;
    const response = yield* http.execute(exports_HttpClientRequest.get(`${API_BASE2}/search/issues?${params.toString()}`).pipe(exports_HttpClientRequest.setHeaders(headers))).pipe(exports_Effect.timeout(timeout3));
    if (response.status < 200 || response.status >= 400)
      return [];
    const raw2 = yield* response.text;
    if (!raw2)
      return [];
    return parseGitHubIssuesResults(raw2, numResults);
  });
}
function parseGitHubIssuesResults(raw2, maxResults) {
  let parsed;
  try {
    parsed = JSON.parse(raw2);
  } catch {
    return [];
  }
  const items = parsed?.items;
  if (!Array.isArray(items))
    return [];
  const results = [];
  let pos = 0;
  for (const item of items) {
    if (results.length >= maxResults)
      break;
    if (!item.title || !item.html_url)
      continue;
    const isPR = !!item.pull_request;
    const type = isPR ? "PR" : "Issue";
    const state = item.state === "open" ? "\uD83D\uDFE2" : "\uD83D\uDD34";
    const labels = item.labels?.map((l) => l.name).filter(Boolean).join(", ") || "";
    const author = item.user?.login || "";
    const repoName = item.repository_url?.split("/").slice(-2).join("/") || "";
    const comments = item.comments ?? 0;
    const bodyPreview = item.body ? item.body.replace(/<[^>]*>/g, "").slice(0, 150).trim() : "";
    const parts2 = [
      state,
      type,
      repoName ? `in ${repoName}` : "",
      author ? `by @${author}` : "",
      labels ? `[${labels}]` : "",
      `${comments} comments`
    ].filter(Boolean);
    pos++;
    results.push(makeSearchResult({
      title: `${isPR ? "\uD83D\uDD00" : "❓"} ${item.title}`,
      url: item.html_url,
      snippet: parts2.join(" · ") + (bodyPreview ? `
${bodyPreview}` : ""),
      engine: "github-issues",
      position: pos,
      publishedDate: item.updated_at ? new Date(item.updated_at).getTime() : undefined,
      category: "code"
    }));
  }
  return results;
}

// src/search/engines/github-repo-files.ts
var API_BASE3 = "https://api.github.com";
var USER_AGENT18 = "opencode-search/1.0";
function makeGitHubRepoFiles(config) {
  return {
    name: config.name,
    config,
    search: (http, query, opts) => searchGitHubRepoFiles(http, query, opts.numResults || config.maxResults, config.timeout)
  };
}
function parseQuery(query) {
  let ref;
  let mainQuery = query;
  const refMatch = mainQuery.match(/\?ref=([a-zA-Z0-9_.\/-]+)$/);
  if (refMatch) {
    ref = refMatch[1];
    mainQuery = mainQuery.slice(0, refMatch.index);
  }
  const colonIdx = mainQuery.indexOf(":");
  let repoPart;
  let path;
  if (colonIdx >= 0) {
    repoPart = mainQuery.slice(0, colonIdx);
    path = mainQuery.slice(colonIdx + 1);
  } else {
    repoPart = mainQuery;
    path = "";
  }
  const slashIdx = repoPart.indexOf("/");
  if (slashIdx < 0)
    return;
  const owner = repoPart.slice(0, slashIdx);
  const repo = repoPart.slice(slashIdx + 1);
  if (!owner || !repo)
    return;
  return { owner, repo, path: path.replace(/^\//, ""), ref };
}
function searchGitHubRepoFiles(http, query, numResults, timeout3) {
  return exports_Effect.gen(function* () {
    const parsed = parseQuery(query);
    if (!parsed)
      return [];
    const headers = {
      "User-Agent": USER_AGENT18,
      Accept: "application/vnd.github.v3+json"
    };
    const token = process.env.GITHUB_TOKEN;
    if (token)
      headers["Authorization"] = `Bearer ${token}`;
    const { owner, repo, path, ref } = parsed;
    let apiPath = `/repos/${owner}/${repo}/contents/${path}`;
    if (ref)
      apiPath += `?ref=${ref}`;
    const response = yield* http.execute(exports_HttpClientRequest.get(`${API_BASE3}${apiPath}`).pipe(exports_HttpClientRequest.setHeaders(headers))).pipe(exports_Effect.timeout(timeout3));
    if (response.status < 200 || response.status >= 400)
      return [];
    const raw2 = yield* response.text;
    if (!raw2)
      return [];
    return parseRepoContentsResults(raw2, owner, repo, path, ref, numResults);
  });
}
function parseRepoContentsResults(raw2, owner, repo, path, ref, maxResults) {
  let data;
  try {
    data = JSON.parse(raw2);
  } catch {
    return [];
  }
  const results = [];
  let pos = 0;
  if (Array.isArray(data)) {
    const items = data;
    const dirs = items.filter((i) => i.type === "dir");
    const files = items.filter((i) => i.type === "file");
    const sorted = [...dirs, ...files];
    for (const item of sorted) {
      if (results.length >= maxResults)
        break;
      const name = item.name || "";
      const itemPath = item.path || "";
      const type = item.type === "dir" ? "\uD83D\uDCC1" : "\uD83D\uDCC4";
      const size = item.size ? `${(item.size / 1024).toFixed(1)}KB` : "";
      pos++;
      results.push(makeSearchResult({
        title: `${type} ${name}`,
        url: item.html_url || `https://github.com/${owner}/${repo}/blob/${ref || "main"}/${itemPath}`,
        snippet: `${owner}/${repo}: ${itemPath}${size ? ` (${size})` : ""}`,
        engine: "github-repo-files",
        position: pos,
        category: "code"
      }));
    }
  } else if (typeof data === "object" && data !== null) {
    const file2 = data;
    if (file2.type === "file" && file2.content) {
      const content = Buffer.from(file2.content, "base64").toString("utf-8");
      const lines = content.split(`
`);
      const totalLines = lines.length;
      const previewLines = lines.slice(0, 50);
      const truncated = totalLines > 50;
      pos++;
      results.push(makeSearchResult({
        title: `\uD83D\uDCC4 ${file2.name || path}`,
        url: file2.html_url || `https://github.com/${owner}/${repo}/blob/${ref || "main"}/${path}`,
        snippet: [
          `File: ${owner}/${repo}:${file2.path || path}`,
          `Size: ${totalLines} lines${truncated ? ` (showing first 50 of ${totalLines})` : ""}`,
          `Language: ${extToLang(file2.name || "")}`,
          "---",
          previewLines.join(`
`),
          truncated ? `... (${totalLines - 50} more lines)` : ""
        ].filter(Boolean).join(`
`),
        engine: "github-repo-files",
        position: pos,
        category: "code"
      }));
    } else if (file2.type === "dir" && Array.isArray(data)) {}
  }
  return results;
}
function extToLang(filename) {
  const ext = filename.split(".").pop()?.toLowerCase() || "";
  const map8 = {
    ts: "TypeScript",
    tsx: "TypeScript JSX",
    js: "JavaScript",
    jsx: "JavaScript JSX",
    py: "Python",
    rs: "Rust",
    go: "Go",
    java: "Java",
    rb: "Ruby",
    php: "PHP",
    c: "C",
    cpp: "C++",
    cs: "C#",
    swift: "Swift",
    kt: "Kotlin",
    scala: "Scala",
    m: "Objective-C",
    sh: "Shell",
    bash: "Shell",
    zsh: "Shell",
    json: "JSON",
    yaml: "YAML",
    yml: "YAML",
    md: "Markdown",
    rmd: "R Markdown",
    css: "CSS",
    scss: "SCSS",
    less: "Less",
    html: "HTML",
    htm: "HTML",
    xml: "XML",
    sql: "SQL",
    r: "R",
    lua: "Lua",
    toml: "TOML",
    ini: "INI",
    cfg: "INI",
    dockerfile: "Dockerfile",
    makefile: "Makefile"
  };
  return map8[ext] || ext.toUpperCase();
}

// src/search/engines/json-api.ts
function makeJsonApiEngine(cfg) {
  const label = cfg.debugLabel || cfg.name;
  return (config) => ({
    name: config.name,
    config,
    search: (http, query, opts) => searchJsonApi2(http, query, opts.numResults || config.maxResults, config.timeout, cfg)
  });
}
function searchJsonApi2(http, query, numResults, timeout3, cfg) {
  return exports_Effect.gen(function* () {
    const url = cfg.url(query, Math.min(numResults, 50));
    const headers = {
      "User-Agent": cfg.userAgent || "opencode-search/1.0",
      Accept: "application/json",
      ...cfg.headers
    };
    if (cfg.requiresKey && cfg.apiKeyEnv) {
      const key = process.env[cfg.apiKeyEnv];
      if (key) {
        const header = cfg.apiKeyHeader || "Authorization";
        const prefix = cfg.apiKeyPrefix || "Bearer ";
        headers[header] = `${prefix}${key}`;
      }
    }
    const response = yield* http.execute(exports_HttpClientRequest.get(url).pipe(exports_HttpClientRequest.setHeaders(headers))).pipe(exports_Effect.timeout(timeout3));
    if (response.status < 200 || response.status >= 400)
      return [];
    if (response.status === 429 || response.status === 403)
      return [];
    const raw2 = yield* response.text;
    if (!raw2)
      return [];
    let parsed;
    try {
      parsed = JSON.parse(raw2);
    } catch {
      return [];
    }
    return cfg.parse(parsed, numResults);
  });
}

// src/search/engines/open-api.ts
function makeUnsplash(config) {
  return makeJsonApiEngine({
    name: "unsplash",
    category: "image",
    requiresKey: false,
    url: (q, n) => `https://api.unsplash.com/search/photos?query=${encodeURIComponent(q)}&per_page=${n}`,
    parse: (json2, max4) => {
      const data = json2;
      if (!data?.results)
        return [];
      return data.results.slice(0, max4).map((p, i) => makeSearchResult({ title: p.description || `Unsplash ${p.id}`, url: p.links.html, snippet: `Photo by ${p.user.name}`, engine: "unsplash", position: i + 1, category: "image" }));
    },
    debugLabel: "unsplash"
  })(config);
}
function makePubMed(config) {
  return makeJsonApiEngine({
    name: "pubmed",
    category: "academic",
    url: (q, n) => `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=${encodeURIComponent(q)}&retmax=${n}&retmode=json&sort=relevance`,
    parse: (json2, max4) => {
      const data = json2;
      const ids = data?.esearchresult?.idlist;
      if (!ids || ids.length === 0)
        return [];
      return ids.slice(0, max4).map((id, i) => makeSearchResult({ title: `PubMed ID: ${id}`, url: `https://pubmed.ncbi.nlm.nih.gov/${id}/`, snippet: `Total results: ${data.esearchresult?.count || "?"}`, engine: "pubmed", position: i + 1, category: "academic" }));
    }
  })(config);
}
function makeHackerNews(config) {
  return makeJsonApiEngine({
    name: "hackernews",
    category: "news",
    url: (q, n) => `https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(q)}&hitsPerPage=${n}`,
    parse: (json2, max4) => {
      const data = json2;
      if (!data?.hits)
        return [];
      return data.hits.slice(0, max4).map((h, i) => makeSearchResult({ title: h.title || "HN post", url: h.url || `https://news.ycombinator.com/item?id=${h.objectID}`, snippet: `${h.points || 0} points by ${h.author}`, engine: "hackernews", position: i + 1, category: "news", publishedDate: h.created_at ? new Date(h.created_at).getTime() : undefined }));
    }
  })(config);
}
function makeDockerHub(config) {
  return makeJsonApiEngine({
    name: "dockerhub",
    category: "code",
    url: (q, n) => `https://hub.docker.com/v2/repositories/library/${encodeURIComponent(q)}/?page_size=${n}`,
    parse: (json2, max4) => {
      const data = json2;
      if (!data?.results)
        return [];
      return data.results.slice(0, max4).map((r, i) => makeSearchResult({ title: r.repo_name || r.name, url: `https://hub.docker.com/r/${r.repo_name || r.name}`, snippet: r.short_description || `${r.pull_count || 0} pulls`, engine: "dockerhub", position: i + 1, category: "code" }));
    }
  })(config);
}
function makeNpm(config) {
  return makeJsonApiEngine({
    name: "npm",
    category: "code",
    url: (q, n) => `https://registry.npmjs.org/-/v1/search?text=${encodeURIComponent(q)}&size=${n}`,
    parse: (json2, max4) => {
      const data = json2;
      if (!data?.objects)
        return [];
      return data.objects.slice(0, max4).map((o, i) => {
        const pkg = o.package;
        return makeSearchResult({ title: pkg.name, url: pkg.links.npm, snippet: `${pkg.version} — ${pkg.description || ""}`.trim(), engine: "npm", position: i + 1, category: "code" });
      });
    }
  })(config);
}
function makeCoinGecko(config) {
  return makeJsonApiEngine({
    name: "coingecko",
    category: "finance",
    url: (q, n) => `https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(q)}`,
    parse: (json2, max4) => {
      const data = json2;
      if (!data?.coins)
        return [];
      return data.coins.slice(0, max4).map((c, i) => makeSearchResult({
        title: `${c.name} (${c.symbol?.toUpperCase()})`,
        url: `https://www.coingecko.com/en/coins/${c.id}`,
        snippet: c.market_cap_rank ? `Market cap rank #${c.market_cap_rank}` : c.id,
        engine: "coingecko",
        position: i + 1,
        category: "finance"
      }));
    },
    debugLabel: "coingecko"
  })(config);
}
function makeNominatim(config) {
  return makeJsonApiEngine({
    name: "nominatim",
    category: "map",
    userAgent: "opencode-search/1.0 (nominatim)",
    url: (q, n) => `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=${n}&addressdetails=1`,
    parse: (json2, max4) => {
      const data = json2;
      if (!Array.isArray(data))
        return [];
      return data.slice(0, max4).map((p, i) => makeSearchResult({
        title: p.display_name?.split(",")[0] || `Location ${p.place_id}`,
        url: `https://www.openstreetmap.org/?mlat=${p.lat}&mlon=${p.lon}`,
        snippet: `${p.display_name} · type: ${p.type}`,
        engine: "nominatim",
        position: i + 1,
        category: "map"
      }));
    }
  })(config);
}
function makeCore(config) {
  return makeJsonApiEngine({
    name: "core",
    category: "academic",
    url: (q, n) => `https://api.core.ac.uk/v3/search/works?q=${encodeURIComponent(q)}&limit=${n}`,
    parse: (json2, max4) => {
      const data = json2;
      if (!data?.results)
        return [];
      return data.results.slice(0, max4).map((r, i) => {
        const authors = r.authors?.map((a) => a.name).join(", ") || "";
        return makeSearchResult({
          title: r.title || "Untitled",
          url: r.downloadUrl || `https://doi.org/${r.doi || ""}`,
          snippet: `${authors} · ${r.publishedDate || ""}`.trim(),
          engine: "core",
          position: i + 1,
          category: "academic",
          publishedDate: r.publishedDate ? new Date(r.publishedDate).getTime() : undefined
        });
      });
    }
  })(config);
}
function makeMarginalia(config) {
  return makeJsonApiEngine({
    name: "marginalia",
    category: "general",
    url: (q, n) => `https://api.marginalia.nu/search?query=${encodeURIComponent(q)}&count=${n}&index=0`,
    parse: (json2, max4) => {
      const data = json2;
      if (!data?.results)
        return [];
      return data.results.slice(0, max4).map((r, i) => makeSearchResult({
        title: r.title || r.url,
        url: r.url,
        snippet: r.description || "",
        engine: "marginalia",
        position: i + 1,
        publishedDate: r.pubDate ? new Date(r.pubDate).getTime() : undefined
      }));
    },
    debugLabel: "marginalia"
  })(config);
}
function makePodchaser(config) {
  return makeJsonApiEngine({
    name: "podchaser",
    category: "podcast",
    userAgent: "opencode-search/1.0",
    url: (q, n) => `https://api.podchaser.com/podcasts?search=${encodeURIComponent(q)}&limit=${n}`,
    parse: (json2, max4) => {
      const data = json2;
      if (!data?.data)
        return [];
      return data.data.slice(0, max4).map((p, i) => makeSearchResult({
        title: p.title || `Podcast ${p.id}`,
        url: `https://www.podchaser.com/podcasts/${p.id}`,
        snippet: `${p.network || ""} · ${p.description?.slice(0, 120) || ""}`.trim(),
        engine: "podchaser",
        position: i + 1,
        category: "podcast"
      }));
    }
  })(config);
}
function make9GAG(config) {
  return makeJsonApiEngine({
    name: "9gag",
    category: "social",
    userAgent: "opencode-search/1.0",
    url: (q, n) => `https://9gag.com/v1/search-posts?query=${encodeURIComponent(q)}&count=${n}`,
    parse: (json2, max4) => {
      const data = json2;
      const posts = data?.data?.posts;
      if (!Array.isArray(posts))
        return [];
      return posts.slice(0, max4).map((p, i) => makeSearchResult({
        title: p.title || `9GAG ${p.id}`,
        url: p.url || `https://9gag.com/gag/${p.id}`,
        snippet: `${p.description || ""} · ${p.upVoteCount || 0} votes`,
        engine: "9gag",
        position: i + 1,
        category: "social",
        publishedDate: p.creationTs ? p.creationTs * 1000 : undefined
      }));
    }
  })(config);
}
function makeFrinkiac(config) {
  return makeJsonApiEngine({
    name: "frinkiac",
    category: "image",
    url: (q, _n) => `https://frinkiac.com/api/search?q=${encodeURIComponent(q)}`,
    parse: (json2, max4) => {
      const data = json2;
      if (!Array.isArray(data))
        return [];
      return data.slice(0, max4).map((f, i) => {
        const imgUrl = `https://frinkiac.com/img/${f.Episode}/${f.Timestamp}.jpg`;
        return makeSearchResult({
          title: `Simpsons S${f.Episode.split("S")[1]?.split("E")[0] || "?"}E${f.Episode.split("E")[1] || "?"}`,
          url: imgUrl,
          snippet: `Episode ${f.Episode} at ${f.Timestamp}ms`,
          engine: "frinkiac",
          position: i + 1,
          category: "image"
        });
      });
    },
    debugLabel: "frinkiac"
  })(config);
}
function makeAppleAppStore(config) {
  return makeJsonApiEngine({
    name: "apple-app-store",
    category: "software",
    url: (q, n) => `https://itunes.apple.com/search?term=${encodeURIComponent(q)}&limit=${n}&entity=software`,
    parse: (json2, max4) => {
      const data = json2;
      if (!data?.results)
        return [];
      return data.results.slice(0, max4).map((a, i) => makeSearchResult({
        title: a.trackName,
        url: a.trackViewUrl,
        snippet: `${a.sellerName} · ${a.formattedPrice || "Free"} · ⭐${a.averageUserRating?.toFixed(1) || "?"}`,
        engine: "apple-app-store",
        position: i + 1,
        category: "software"
      }));
    },
    debugLabel: "apple-app-store"
  })(config);
}
function makeMediaWiki(config, wikiHost) {
  return makeJsonApiEngine({
    name: config.name,
    category: "general",
    url: (q, n) => `https://${wikiHost}/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(q)}&srlimit=${n}&format=json&origin=*`,
    parse: (json2, max4) => {
      const data = json2;
      if (!data?.query?.search)
        return [];
      return data.query.search.slice(0, max4).map((r, i) => {
        const encodedTitle = encodeURIComponent(r.title.replace(/ /g, "_"));
        return makeSearchResult({
          title: r.title,
          url: `https://${wikiHost}/wiki/${encodedTitle}`,
          snippet: r.snippet?.replace(/<[^>]*>/g, "") || "",
          engine: config.name,
          position: i + 1,
          publishedDate: r.timestamp ? new Date(r.timestamp).getTime() : undefined
        });
      });
    },
    debugLabel: config.name
  })(config);
}
function makePackagist(config) {
  return makeJsonApiEngine({
    name: "packagist",
    category: "code",
    url: (q, n) => `https://packagist.org/search.json?q=${encodeURIComponent(q)}&per_page=${n}`,
    parse: (json2, max4) => {
      const data = json2;
      if (!data?.results)
        return [];
      return data.results.slice(0, max4).map((p, i) => makeSearchResult({
        title: p.name,
        url: p.url,
        snippet: `${p.description || ""} · ⬇${p.downloads || 0} · ⭐${p.favers || 0}`,
        engine: "packagist",
        position: i + 1,
        category: "code"
      }));
    }
  })(config);
}
function makeRubyGems(config) {
  return makeJsonApiEngine({
    name: "rubygems",
    category: "code",
    url: (q, n) => `https://rubygems.org/api/v1/search.json?query=${encodeURIComponent(q)}`,
    parse: (json2, max4) => {
      const data = json2;
      if (!Array.isArray(data))
        return [];
      return data.slice(0, max4).map((g, i) => makeSearchResult({
        title: `${g.name} ${g.version || ""}`,
        url: g.project_uri,
        snippet: `${g.info?.slice(0, 120) || ""} · ⬇${g.downloads || 0}`,
        engine: "rubygems",
        position: i + 1,
        category: "code"
      }));
    }
  })(config);
}
function makePubDev(config) {
  return makeJsonApiEngine({
    name: "pub-dev",
    category: "code",
    url: (q, n) => `https://pub.dev/api/search?q=${encodeURIComponent(q)}`,
    parse: (json2, max4) => {
      const data = json2;
      if (!data?.packages)
        return [];
      return data.packages.slice(0, max4).map((p, i) => makeSearchResult({
        title: p.package,
        url: p.url || `https://pub.dev/packages/${p.package}`,
        snippet: `Dart/Flutter package: ${p.package}`,
        engine: "pub-dev",
        position: i + 1,
        category: "code"
      }));
    },
    debugLabel: "pub-dev"
  })(config);
}
function makeMankier(config) {
  return makeJsonApiEngine({
    name: "mankier",
    category: "code",
    url: (q, _n) => `https://www.mankier.com/api/v2/mans/?q=${encodeURIComponent(q)}`,
    parse: (json2, max4) => {
      const data = json2;
      if (!data?.results)
        return [];
      return data.results.slice(0, max4).map((m, i) => makeSearchResult({
        title: m.name,
        url: m.url,
        snippet: m.description || `man page: ${m.name}`,
        engine: "mankier",
        position: i + 1,
        category: "code"
      }));
    }
  })(config);
}
function makeWiby(config) {
  return makeJsonApiEngine({
    name: "wiby",
    category: "general",
    url: (q, _n) => `https://wiby.me/json/?q=${encodeURIComponent(q)}`,
    parse: (json2, max4) => {
      const data = json2;
      if (!Array.isArray(data))
        return [];
      return data.slice(0, max4).map((w, i) => makeSearchResult({
        title: w.title || w.url,
        url: w.url,
        snippet: w.snippet || "",
        engine: "wiby",
        position: i + 1
      }));
    }
  })(config);
}
function makeEncyclosearch(config) {
  return makeJsonApiEngine({
    name: "encyclosearch",
    category: "general",
    url: (q, n) => `https://encyclosearch.org/encyclosphere/search?q=${encodeURIComponent(q)}&resultsPerPage=${n}`,
    parse: (json2, max4) => {
      const data = json2;
      if (!data?.Results)
        return [];
      return data.Results.slice(0, max4).map((r, i) => makeSearchResult({
        title: r.Title || "Untitled",
        url: r.SourceURL,
        snippet: r.Description || "",
        engine: "encyclosearch",
        position: i + 1
      }));
    }
  })(config);
}
function makeOpenAirePublications(config) {
  return makeJsonApiEngine({
    name: "openaire-publications",
    category: "academic",
    url: (q, n) => `https://api.openaire.eu/search/publications?format=json&size=${n}&title=${encodeURIComponent(q)}`,
    parse: (json2, max4) => {
      const data = json2;
      const response = data.response;
      const resultsObj = response?.results;
      const results = resultsObj?.result;
      if (!Array.isArray(results))
        return [];
      return results.slice(0, max4).map((r, i) => {
        const metadata = r.metadata;
        const entity = metadata?.["oaf:entity"];
        const oafResult = entity?.["oaf:result"];
        const titleArr = oafResult?.title;
        const descArr = oafResult?.description;
        const children = oafResult?.children;
        const title = titleArr?.[0]?.["$"] || "Untitled";
        const desc = descArr?.[0]?.["$"] || "";
        const url = children?.instance?.webresource?.url?.[0]?.["$"] || "";
        return makeSearchResult({
          title,
          url,
          snippet: desc.slice(0, 150),
          engine: "openaire",
          position: i + 1,
          category: "academic"
        });
      });
    },
    debugLabel: "openaire"
  })(config);
}
function makeHoogle(config) {
  return makeJsonApiEngine({
    name: "hoogle",
    category: "code",
    url: (q, _n) => `https://hoogle.haskell.org/?hoogle=${encodeURIComponent(q)}&mode=json`,
    parse: (json2, max4) => {
      const data = json2;
      if (!Array.isArray(data))
        return [];
      return data.slice(0, max4).map((h, i) => makeSearchResult({
        title: h.name,
        url: h.url,
        snippet: `${h.docs?.slice(0, 120) || ""} · ${h.package?.name || ""}`,
        engine: "hoogle",
        position: i + 1,
        category: "code"
      }));
    },
    debugLabel: "hoogle"
  })(config);
}
function makeEtymonline(config) {
  return makeJsonApiEngine({
    name: "etymonline",
    category: "dictionary",
    url: (q, _n) => `https://www.etymonline.com/search?q=${encodeURIComponent(q)}`,
    parse: (_json, _max) => [],
    debugLabel: "etymonline"
  })(config);
}

// src/search/engines/z-library.ts
var MIRRORS = [
  { name: "z-lib.gs", url: "https://api.z-lib.gs" },
  { name: "z-lib.su", url: "https://z-lib.su" },
  { name: "z-library-is", url: "https://z-library.is" },
  { name: "z-library-sk", url: "https://z-library.sk" },
  { name: "z-lib-gd", url: "https://zh.z-lib.gd" },
  { name: "zh-z-library-sk", url: "https://zh.z-library.sk" }
];
var USER_AGENT19 = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36";
function makeZLibrary(config) {
  return {
    name: config.name,
    config,
    search: (http, query, opts) => searchZLibrary(http, query, opts.numResults || config.maxResults, config.timeout)
  };
}
function searchZLibrary(http, query, numResults, timeout3) {
  const searchLoop = (idx) => exports_Effect.gen(function* () {
    if (idx >= MIRRORS.length)
      return [];
    const mirror = MIRRORS[idx];
    const results = yield* tryMirror(http, mirror, query, numResults, timeout3).pipe(exports_Effect.catchIf(() => true, () => exports_Effect.succeed([])));
    if (results.length > 0)
      return results;
    return yield* searchLoop(idx + 1);
  });
  return searchLoop(0);
}
function tryMirror(http, mirror, query, numResults, timeout3) {
  return exports_Effect.gen(function* () {
    const url = `${mirror.url}/search?q=${encodeURIComponent(query)}&limit=${numResults}`;
    const response = yield* http.execute(exports_HttpClientRequest.get(url).pipe(exports_HttpClientRequest.setHeaders({ "User-Agent": USER_AGENT19, Accept: "application/json, text/html" }))).pipe(exports_Effect.timeout(timeout3 * 0.8));
    if (response.status < 200 || response.status >= 400)
      return [];
    const raw2 = yield* response.text.pipe(exports_Effect.catchIf(() => true, () => exports_Effect.succeed("")));
    if (!raw2)
      return [];
    const json2 = parseZLibJson(raw2, numResults, mirror.name);
    if (json2.length > 0)
      return json2;
    return parseZLibHtml(raw2, numResults);
  });
}
function parseZLibJson(raw2, max4, _source) {
  let parsed;
  try {
    parsed = JSON.parse(raw2);
  } catch {
    return [];
  }
  const data = parsed;
  const books = data.books || data.items || data.data || [];
  if (!Array.isArray(books))
    return [];
  return books.slice(0, max4).map((b, i) => makeSearchResult({
    title: b.title || "Untitled",
    url: b.url || "",
    snippet: `${b.author || ""} · ${b.year || ""} — ${(b.description || "").slice(0, 100)}`.trim(),
    engine: "z-library",
    position: i + 1,
    category: "book"
  }));
}
function parseZLibHtml(html, max4) {
  const results = [];
  let pos = 0;
  const itemRe = /<a[^>]*href="(\/[^"]+)"[^>]*>([^<]+)<\/a>/gi;
  const seen = new Set;
  let match6;
  while ((match6 = itemRe.exec(html)) !== null && results.length < max4) {
    const path = match6[1];
    const title = match6[2].replace(/<[^>]*>/g, "").trim();
    if (!title || title.length < 3 || seen.has(path) || !path.includes("/book"))
      continue;
    seen.add(path);
    pos++;
    results.push(makeSearchResult({
      title,
      url: `https://singlelogin.re${path}`,
      snippet: "Z-Library book",
      engine: "z-library",
      position: pos,
      category: "book"
    }));
  }
  return results;
}

// src/search/engines/bing-images.ts
var BING_IMAGES_URL = "https://www.bing.com/images/async";
var USER_AGENT20 = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36";
function makeBingImages(config) {
  return {
    name: config.name,
    config,
    search: (http, query, opts) => searchBingImages(http, query, opts.numResults || config.maxResults, config.timeout)
  };
}
function searchBingImages(http, query, numResults, timeout3) {
  return exports_Effect.gen(function* () {
    const params = new URLSearchParams({
      q: query,
      async: "1",
      first: "1",
      count: String(Math.min(numResults, 35))
    });
    const response = yield* http.execute(exports_HttpClientRequest.get(`${BING_IMAGES_URL}?${params.toString()}`).pipe(exports_HttpClientRequest.setHeaders({
      "User-Agent": USER_AGENT20,
      "Accept-Language": "en-US,en;q=0.9,zh-CN;q=0.8",
      Accept: "text/html,application/xhtml+xml"
    }))).pipe(exports_Effect.timeout(timeout3));
    if (response.status < 200 || response.status >= 400)
      return [];
    const html = yield* response.text;
    if (!html || html.includes("captcha"))
      return [];
    return parseBingImagesResults(html, numResults);
  });
}
function parseBingImagesResults(html, maxResults) {
  const results = [];
  let pos = 0;
  const listStart = html.indexOf("dgControl_list");
  const searchHtml = listStart === -1 ? html : html.slice(listStart);
  const itemRegex = /<li[^>]*>[\s\S]*?<a[^>]*class="iusc"[^>]*m="([^"]*)"[\s\S]*?<\/li>/gi;
  let match6;
  while ((match6 = itemRegex.exec(searchHtml)) !== null) {
    if (results.length >= maxResults)
      break;
    const block = match6[0];
    const metadataRaw = match6[1];
    let metadata = null;
    try {
      const cleanJson = metadataRaw.replace(/&quot;/g, '"').replace(/&#39;/g, "'");
      metadata = JSON.parse(cleanJson);
    } catch {
      continue;
    }
    const pageUrl = metadata?.purl;
    const imgUrl = metadata?.murl;
    if (!pageUrl || !imgUrl)
      continue;
    const titleMatch = block.match(/<div[^>]*class="infnmpt"[^>]*>[\s\S]*?<a[^>]*>([\s\S]*?)<\/a>/i);
    const title = titleMatch ? titleMatch[1].replace(/<[^>]*>/g, "").trim() : "";
    const formatMatch = block.match(/<div[^>]*class="imgpt"[^>]*>[\s\S]*?<span[^>]*>([^<]*)<\/span>/i);
    const resolution = formatMatch ? formatMatch[1].trim() : "";
    pos++;
    results.push(makeSearchResult({
      title: title || `Image ${pos}`,
      url: pageUrl,
      snippet: `${resolution} · ${imgUrl.slice(0, 80)}`.trim(),
      engine: "bing-images",
      position: pos,
      category: "image"
    }));
  }
  return results;
}

// src/search/engines/sogou.ts
var SEARCH_URL8 = "https://www.sogou.com/web";
var USER_AGENT21 = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36";
function makeSogou(config) {
  return {
    name: config.name,
    config,
    search: (http, query, opts) => searchSogou(http, query, opts.numResults || config.maxResults, config.timeout)
  };
}
function searchSogou(http, query, numResults, timeout3) {
  return exports_Effect.gen(function* () {
    const params = new URLSearchParams({ query, page: "1" });
    const response = yield* http.execute(exports_HttpClientRequest.get(`${SEARCH_URL8}?${params.toString()}`).pipe(exports_HttpClientRequest.setHeaders({
      "User-Agent": USER_AGENT21,
      "Accept-Language": "zh-CN,zh;q=0.9",
      Accept: "text/html"
    }))).pipe(exports_Effect.timeout(timeout3));
    if (response.status === 302 || response.status < 200 || response.status >= 400)
      return [];
    const html = yield* response.text;
    if (!html || html.includes("antispider"))
      return [];
    return parseSogouResults(html, numResults);
  });
}
function parseSogouResults(html, maxResults) {
  const results = [];
  let pos = 0;
  const blockRegex = /<div[^>]*class="(?:rb|vrwrap[^"]*)"[^>]*>[\s\S]*?<\/div>\s*<\/div>/gi;
  let match6;
  while ((match6 = blockRegex.exec(html)) !== null) {
    if (results.length >= maxResults)
      break;
    const block = match6[0];
    if (block.includes("special-wrap"))
      continue;
    let title = "", url = "";
    const h3aMatch = block.match(/<h3[^>]*class="pt"[^>]*>[\s\S]*?<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/i);
    const vrTitleMatch = block.match(/<h3[^>]*class="[^"]*vr-title[^"]*"[^>]*>[\s\S]*?<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/i);
    if (h3aMatch) {
      url = h3aMatch[1];
      title = h3aMatch[2].replace(/<[^>]*>/g, "").trim();
    } else if (vrTitleMatch) {
      url = vrTitleMatch[1];
      title = vrTitleMatch[2].replace(/<[^>]*>/g, "").trim();
    } else
      continue;
    if (!title || !url)
      continue;
    if (url.startsWith("/link?url=")) {
      const dataUrlMatch = block.match(/data-url="([^"]+)"/);
      url = dataUrlMatch ? dataUrlMatch[1] : `https://www.sogou.com${url}`;
    }
    let snippet = "";
    const ftMatch = block.match(/<div[^>]*class="ft"[^>]*>([\s\S]*?)<\/div>/i);
    if (ftMatch)
      snippet = ftMatch[1].replace(/<[^>]*>/g, "").trim();
    let publishedDate;
    const citeMatch = block.match(/<cite[^>]*>([^<]*)<\/cite>/i);
    if (citeMatch) {
      const dateText = citeMatch[1].trim();
      const d = dateText.match(/(\d{4}-\d{1,2}-\d{1,2})/);
      if (d)
        publishedDate = new Date(d[1]).getTime();
    }
    pos++;
    results.push(makeSearchResult({
      title,
      url,
      snippet: snippet.slice(0, 300),
      engine: "sogou",
      position: pos,
      publishedDate
    }));
  }
  return results;
}

// src/search/engines/360search.ts
var SEARCH_URL9 = "https://www.so.com/s";
var USER_AGENT22 = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36";
function make360Search(config) {
  return { name: config.name, config, search: (http, q, opts) => search360(http, q, opts.numResults || config.maxResults, config.timeout) };
}
function search360(http, query, numResults, timeout3) {
  return exports_Effect.gen(function* () {
    const response = yield* http.execute(exports_HttpClientRequest.get(`${SEARCH_URL9}?q=${encodeURIComponent(query)}`).pipe(exports_HttpClientRequest.setHeaders({ "User-Agent": USER_AGENT22, "Accept-Language": "zh-CN,zh", Accept: "text/html" }))).pipe(exports_Effect.timeout(timeout3));
    if (response.status < 200 || response.status >= 400)
      return [];
    const html = yield* response.text;
    if (!html)
      return [];
    return parse360Results(html, numResults);
  });
}
function parse360Results(html, maxResults) {
  const results = [];
  let pos = 0;
  const blockRegex = /<(?:li|div)[^>]*class="(?:res-list|result)[^"]*"[^>]*>[\s\S]*?<\/(?:li|div)>/gi;
  let match6;
  while ((match6 = blockRegex.exec(html)) !== null) {
    if (results.length >= maxResults)
      break;
    const block = match6[0];
    const aMatch = block.match(/<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/i);
    if (!aMatch)
      continue;
    let url = aMatch[1];
    const title = aMatch[2].replace(/<[^>]*>/g, "").trim();
    if (!title || !url)
      continue;
    const pMatch = block.match(/<p[^>]*class="[^"]*res-desc[^"]*"[^>]*>([\s\S]*?)<\/p>/i);
    const snippet = pMatch ? pMatch[1].replace(/<[^>]*>/g, "").trim() : "";
    pos++;
    results.push(makeSearchResult({ title, url, snippet: snippet.slice(0, 300), engine: "360search", position: pos }));
  }
  return results;
}

// src/search/engines/google-traits.ts
var LANG_MAP = {
  en: "lang_en",
  zh_CN: "lang_zh-CN",
  zh_TW: "lang_zh-TW",
  ja: "lang_ja",
  ko: "lang_ko",
  de: "lang_de",
  fr: "lang_fr",
  es: "lang_es",
  it: "lang_it",
  pt: "lang_pt",
  pt_BR: "lang_pt-BR",
  ru: "lang_ru",
  ar: "lang_ar",
  tr: "lang_tr",
  nl: "lang_nl",
  sv: "lang_sv",
  da: "lang_da",
  fi: "lang_fi",
  nb: "lang_no",
  pl: "lang_pl",
  cs: "lang_cs",
  hu: "lang_hu",
  ro: "lang_ro",
  th: "lang_th",
  vi: "lang_vi",
  id: "lang_id",
  ms: "lang_ms",
  fil: "lang_fil"
};
var DOMAIN_MAP = {
  US: "www.google.com",
  GB: "www.google.co.uk",
  DE: "www.google.de",
  FR: "www.google.fr",
  JP: "www.google.co.jp",
  KR: "www.google.co.kr",
  CN: "www.google.com.hk",
  TW: "www.google.com.tw",
  HK: "www.google.com.hk",
  CA: "www.google.ca",
  AU: "www.google.com.au",
  IN: "www.google.co.in",
  BR: "www.google.com.br",
  RU: "www.google.ru",
  IT: "www.google.it",
  ES: "www.google.es",
  NL: "www.google.nl",
  SE: "www.google.se",
  PL: "www.google.pl",
  TR: "www.google.com.tr",
  AR: "www.google.com.ar",
  MX: "www.google.com.mx",
  SG: "www.google.com.sg"
};
function getGoogleInfo(lang) {
  const country = guessCountry(lang);
  const langNorm = normalizeLang(lang);
  const langOrig = lang?.replace("_", "-") || "en";
  const engLang = LANG_MAP[langNorm] || (langNorm ? LANG_MAP[langNorm.split("_")[0]] : undefined) || "lang_en";
  const subdomain = DOMAIN_MAP[country] || "www.google.com";
  const params = {
    hl: langOrig,
    lr: engLang,
    cr: country !== "US" ? `country${country}` : "",
    ie: "utf8",
    oe: "utf8"
  };
  if (!lang || lang === "all") {
    params.lr = "";
  }
  const headers = {
    Accept: "*/*",
    "User-Agent": genGoogleUa(country)
  };
  const cookies = {
    CONSENT: "YES+"
  };
  return { language: engLang, country, subdomain, params, headers, cookies };
}
function guessCountry(lang) {
  if (!lang)
    return "US";
  const parts2 = lang.split("-");
  if (parts2.length > 1)
    return parts2[1].toUpperCase();
  const map8 = {
    zh: "CN",
    ja: "JP",
    ko: "KR",
    de: "DE",
    fr: "FR",
    es: "ES",
    pt: "BR",
    ru: "RU",
    it: "IT",
    ar: "SA",
    tr: "TR",
    nl: "NL",
    sv: "SE",
    pl: "PL",
    da: "DK",
    fi: "FI",
    nb: "NO",
    th: "TH",
    vi: "VN",
    id: "ID",
    ms: "MY"
  };
  return map8[parts2[0]] || "US";
}
function normalizeLang(lang) {
  if (!lang)
    return "en";
  return lang.replace("-", "_");
}
function genGoogleUa(country) {
  return `Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Mobile Safari/537.36 (gws, country:${country})`;
}
function isGoogleCaptcha(status, body, url) {
  if (status === 302 || status === 303)
    return true;
  if (!body)
    return false;
  if (body.length < 2000 && (body.includes("/sorry/") || body.includes("sorry.google")))
    return true;
  if (url && (url.includes("sorry.google") || url.includes("/sorry/")))
    return true;
  return false;
}

// src/search/engines/google.ts
function makeGoogle(config) {
  return {
    name: config.name,
    config,
    search: (http, query, opts) => searchGoogle(http, query, opts.numResults || config.maxResults, config.timeout, opts.lang)
  };
}
function searchGoogle(http, query, numResults, timeout3, lang) {
  return exports_Effect.gen(function* () {
    const info = getGoogleInfo(lang);
    const params = new URLSearchParams({
      q: query,
      num: String(Math.min(numResults, 20)),
      start: "0",
      filter: "0",
      safe: "off",
      ...info.params
    });
    const url = `https://${info.subdomain}/search?${params.toString()}`;
    const response = yield* http.execute(exports_HttpClientRequest.get(url).pipe(exports_HttpClientRequest.setHeaders({
      ...info.headers,
      "Accept-Language": lang?.replace("_", "-") || "en-US,en;q=0.9",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      Cookie: Object.entries(info.cookies).map(([k, v]) => `${k}=${v}`).join("; ")
    }))).pipe(exports_Effect.timeout(timeout3));
    if (response.status < 200 || response.status >= 400)
      return [];
    const html = yield* response.text;
    if (!html)
      return [];
    if (isGoogleCaptcha(response.status, html))
      return [];
    return parseGoogleResults(html, numResults);
  });
}
function parseGoogleResults(html, maxResults) {
  const results = [];
  let pos = 0;
  const titleRegex = /<a[^>]*data-ved[^>]*href="\/url\?q=([^"&]+)[^"]*"[^>]*>[\s\S]*?<h3[^>]*>([\s\S]*?)<\/h3>[\s\S]*?<\/a>/gi;
  const titlePositions = [];
  let titleMatch;
  while ((titleMatch = titleRegex.exec(html)) !== null) {
    if (titlePositions.length >= maxResults * 2)
      break;
    let url = decodeURIComponent(titleMatch[1]);
    if (url.includes("&sa=U"))
      url = url.split("&sa=U")[0];
    const title = titleMatch[2].replace(/<[^>]*>/g, "").trim();
    if (title && url)
      titlePositions.push({ url, title, index: titleMatch.index });
  }
  for (const tp of titlePositions) {
    if (results.length >= maxResults)
      break;
    const after = html.slice(tp.index, tp.index + 2000);
    let snippet = "";
    const snipMatch = after.match(/<div[^>]*class="[^"]*VwiC3b[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
    if (snipMatch)
      snippet = snipMatch[1].replace(/<[^>]*>/g, "").trim();
    pos++;
    results.push(makeSearchResult({
      title: tp.title,
      url: tp.url,
      snippet: snippet.slice(0, 300),
      engine: "google",
      position: pos
    }));
  }
  return results;
}

// src/search/engines/yandex.ts
var SEARCH_URL10 = "https://yandex.com/search/site";
var USER_AGENT23 = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36";
function makeYandex(config) {
  return {
    name: config.name,
    config,
    search: (http, query, opts) => searchYandex(http, query, opts.numResults || config.maxResults, config.timeout)
  };
}
function searchYandex(http, query, numResults, timeout3) {
  return exports_Effect.gen(function* () {
    const params = new URLSearchParams({
      text: query,
      tmpl_version: "releases",
      web: "1",
      frame: "1",
      searchid: "3131712"
    });
    const response = yield* http.execute(exports_HttpClientRequest.get(`${SEARCH_URL10}?${params.toString()}`).pipe(exports_HttpClientRequest.setHeaders({
      "User-Agent": USER_AGENT23,
      "Accept-Language": "en-US,en;q=0.9",
      Accept: "text/html,application/xhtml+xml"
    }))).pipe(exports_Effect.timeout(timeout3));
    if (response.status < 200 || response.status >= 400)
      return [];
    const captchaHeader = response.headers?.["x-yandex-captcha"];
    if (captchaHeader === "captcha")
      return [];
    const html = yield* response.text;
    if (!html)
      return [];
    return parseYandexResults(html, numResults);
  });
}
function parseYandexResults(html, maxResults) {
  const results = [];
  let pos = 0;
  const itemRegex = /<li[^>]*class="[^"]*serp-item[^"]*"[^>]*>[\s\S]*?<\/li>/gi;
  let match6;
  while ((match6 = itemRegex.exec(html)) !== null) {
    if (results.length >= maxResults)
      break;
    const block = match6[0];
    const urlMatch = block.match(/<a[^>]*class="[^"]*b-serp-item__title-link[^"]*"[^>]*href="([^"]*)"[^>]*>/i);
    if (!urlMatch)
      continue;
    const url = urlMatch[1];
    if (!url)
      continue;
    let title = "";
    const titleMatch = block.match(/<span[^>]*>([\s\S]*?)<\/span>\s*<\/a>/i);
    if (titleMatch)
      title = titleMatch[1].replace(/<[^>]*>/g, "").trim();
    if (!title)
      continue;
    let snippet = "";
    const snippetMatch = block.match(/<div[^>]*class="[^"]*b-serp-item__text[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
    if (snippetMatch)
      snippet = snippetMatch[1].replace(/<[^>]*>/g, "").trim();
    pos++;
    results.push(makeSearchResult({
      title,
      url,
      snippet: snippet.slice(0, 300),
      engine: "yandex",
      position: pos
    }));
  }
  return results;
}

// src/search/engines/naver.ts
var SEARCH_URL11 = "https://search.naver.com/search.naver";
var USER_AGENT24 = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36";
function makeNaver(config) {
  return {
    name: config.name,
    config,
    search: (http, query, opts) => searchNaver(http, query, opts.numResults || config.maxResults, config.timeout)
  };
}
function searchNaver(http, query, numResults, timeout3) {
  return exports_Effect.gen(function* () {
    const params = new URLSearchParams({
      where: "web",
      query,
      start: "1"
    });
    const response = yield* http.execute(exports_HttpClientRequest.get(`${SEARCH_URL11}?${params.toString()}`).pipe(exports_HttpClientRequest.setHeaders({
      "User-Agent": USER_AGENT24,
      "Accept-Language": "ko-KR,ko;q=0.9,en;q=0.8",
      Accept: "text/html"
    }))).pipe(exports_Effect.timeout(timeout3));
    if (response.status < 200 || response.status >= 400)
      return [];
    const html = yield* response.text;
    if (!html)
      return [];
    return parseNaverResults(html, numResults);
  });
}
function parseNaverResults(html, maxResults) {
  const results = [];
  let pos = 0;
  const itemRegex = /<li[^>]*class="[^"]*bx[^"]*"[^>]*>[\s\S]*?<\/li>/gi;
  let match6;
  while ((match6 = itemRegex.exec(html)) !== null) {
    if (results.length >= maxResults)
      break;
    const block = match6[0];
    const titleMatch = block.match(/<a[^>]*class="[^"]*link_tit[^"]*"[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/i);
    if (!titleMatch)
      continue;
    const url = titleMatch[1];
    const title = titleMatch[2].replace(/<[^>]*>/g, "").trim();
    if (!title || !url)
      continue;
    let snippet = "";
    const snipMatch = block.match(/<a[^>]*class="[^"]*api_txt_lines[^"]*"[^>]*>([\s\S]*?)<\/a>/i);
    if (snipMatch)
      snippet = snipMatch[1].replace(/<[^>]*>/g, "").trim();
    pos++;
    results.push(makeSearchResult({
      title,
      url,
      snippet: snippet.slice(0, 300),
      engine: "naver",
      position: pos
    }));
  }
  return results;
}

// src/search/engines/google-images.ts
function makeGoogleImages(config) {
  return {
    name: config.name,
    config,
    search: (http, query, opts) => searchGoogleImages(http, query, opts.numResults || config.maxResults, config.timeout, opts.lang)
  };
}
function searchGoogleImages(http, query, numResults, timeout3, lang) {
  return exports_Effect.gen(function* () {
    const info = getGoogleInfo(lang);
    const params = new URLSearchParams({
      q: query,
      tbm: "isch",
      hl: info.params.hl,
      lr: info.params.lr,
      asearch: "isch"
    });
    const asyncParam = `_fmt:json,p:1,ijn:0`;
    const url = `https://${info.subdomain}/search?${params.toString()}&${asyncParam}`;
    const response = yield* http.execute(exports_HttpClientRequest.get(url).pipe(exports_HttpClientRequest.setHeaders({
      "User-Agent": info.headers["User-Agent"],
      "Accept-Language": lang?.replace("_", "-") || "en-US,en;q=0.9",
      Accept: "*/*",
      Cookie: Object.entries(info.cookies).map(([k, v]) => `${k}=${v}`).join("; ")
    }))).pipe(exports_Effect.timeout(timeout3));
    if (response.status < 200 || response.status >= 400)
      return [];
    const raw2 = yield* response.text;
    if (!raw2)
      return [];
    if (isGoogleCaptcha(response.status, raw2))
      return [];
    return parseGoogleImagesResults(raw2, numResults);
  });
}
function parseGoogleImagesResults(raw2, maxResults) {
  const results = [];
  const jsonStart = raw2.indexOf('{"ischj":');
  if (jsonStart === -1)
    return [];
  let data;
  try {
    data = JSON.parse(raw2.slice(jsonStart));
  } catch {
    return [];
  }
  const items = data?.ischj?.metadata;
  if (!items || !Array.isArray(items))
    return [];
  let pos = 0;
  for (const item of items) {
    if (results.length >= maxResults)
      break;
    if (!item?.result)
      continue;
    const result3 = item.result;
    const pageUrl = result3.referrer_url;
    const title = result3.page_title?.trim();
    const imgUrl = item.original_image?.url;
    const snippet = item.text_in_grid?.snippet?.trim() || "";
    if (!title || !pageUrl || !imgUrl)
      continue;
    pos++;
    results.push(makeSearchResult({
      title,
      url: pageUrl,
      snippet: `${imgUrl.slice(0, 100)} · ${snippet}`.slice(0, 300),
      engine: "google-images",
      position: pos,
      category: "image"
    }));
  }
  return results;
}

// src/search/engines/bing-videos.ts
var SEARCH_URL12 = "https://www.bing.com/videos/asyncv2";
var USER_AGENT25 = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36";
function makeBingVideos(config) {
  return {
    name: config.name,
    config,
    search: (http, query, opts) => searchBingVideos(http, query, opts.numResults || config.maxResults, config.timeout)
  };
}
function searchBingVideos(http, query, numResults, timeout3) {
  return exports_Effect.gen(function* () {
    const params = new URLSearchParams({
      q: query,
      async: "content",
      first: "1",
      count: String(Math.min(numResults, 35))
    });
    const response = yield* http.execute(exports_HttpClientRequest.get(`${SEARCH_URL12}?${params.toString()}`).pipe(exports_HttpClientRequest.setHeaders({
      "User-Agent": USER_AGENT25,
      "Accept-Language": "en-US,en;q=0.9",
      Accept: "text/html"
    }))).pipe(exports_Effect.timeout(timeout3));
    if (response.status < 200 || response.status >= 400)
      return [];
    const html = yield* response.text;
    if (!html || html.includes("captcha"))
      return [];
    return parseBingVideosResults(html, numResults);
  });
}
function parseBingVideosResults(html, maxResults) {
  const results = [];
  let pos = 0;
  const itemRegex = /<div[^>]*id="mc_vtvc_video[^"]*"[^>]*>[\s\S]*?<div[^>]*class="vrhdata"[^>]*vrhm="([^"]*)"[\s\S]*?<\/div>\s*<\/div>/gi;
  let match6;
  while ((match6 = itemRegex.exec(html)) !== null) {
    if (results.length >= maxResults)
      break;
    const block = match6[0];
    const metadataRaw = match6[1];
    let meta;
    try {
      meta = JSON.parse(metadataRaw.replace(/&quot;/g, '"'));
    } catch {
      continue;
    }
    const title = meta?.vt?.trim();
    const url = meta?.murl;
    if (!title || !url)
      continue;
    pos++;
    results.push(makeSearchResult({
      title,
      url,
      snippet: meta.du ? `时长: ${meta.du}` : "",
      engine: "bing-videos",
      position: pos,
      category: "video"
    }));
  }
  return results;
}

// src/search/engines/dailymotion.ts
var API_URL6 = "https://api.dailymotion.com/videos";
var USER_AGENT26 = "opencode-search/1.0";
function makeDailymotion(config) {
  return {
    name: config.name,
    config,
    search: (http, query, opts) => searchDailymotion(http, query, opts.numResults || config.maxResults, config.timeout)
  };
}
function searchDailymotion(http, query, numResults, timeout3) {
  return exports_Effect.gen(function* () {
    const params = new URLSearchParams({
      search: query,
      sort: "relevance",
      limit: String(Math.min(numResults, 50)),
      fields: "title,url,description,created_time,duration,thumbnail_360_url",
      family_filter: "false",
      password_protected: "false",
      private: "false"
    });
    const response = yield* http.execute(exports_HttpClientRequest.get(`${API_URL6}?${params.toString()}`).pipe(exports_HttpClientRequest.setHeaders({
      "User-Agent": USER_AGENT26,
      Accept: "application/json"
    }))).pipe(exports_Effect.timeout(timeout3));
    if (response.status < 200 || response.status >= 400)
      return [];
    const raw2 = yield* response.text;
    if (!raw2)
      return [];
    return parseDailymotionResults(raw2, numResults);
  });
}
function parseDailymotionResults(raw2, maxResults) {
  const results = [];
  let data;
  try {
    data = JSON.parse(raw2);
  } catch {
    return [];
  }
  const items = data?.list;
  if (!items || !Array.isArray(items))
    return [];
  let pos = 0;
  for (const item of items) {
    if (results.length >= maxResults)
      break;
    if (!item.title || !item.url)
      continue;
    const desc = item.description?.replace(/<[^>]*>/g, "").trim() || "";
    const duration = item.duration || 0;
    const durStr = duration > 3600 ? `${Math.floor(duration / 3600)}:${String(Math.floor(duration % 3600 / 60)).padStart(2, "0")}:${String(duration % 60).padStart(2, "0")}` : `${Math.floor(duration / 60)}:${String(duration % 60).padStart(2, "0")}`;
    pos++;
    results.push(makeSearchResult({
      title: item.title,
      url: item.url,
      snippet: `${durStr} — ${desc.slice(0, 200)}`,
      engine: "dailymotion",
      position: pos,
      publishedDate: item.created_time ? item.created_time * 1000 : undefined,
      category: "video"
    }));
  }
  return results;
}

// src/search/engines/soundcloud.ts
var SEARCH_URL13 = "https://soundcloud.com/search";
var USER_AGENT27 = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36";
function makeSoundCloud(config) {
  return {
    name: config.name,
    config,
    search: (http, query, opts) => searchSoundCloud(http, query, opts.numResults || config.maxResults, config.timeout)
  };
}
function searchSoundCloud(http, query, numResults, timeout3) {
  return exports_Effect.gen(function* () {
    const response = yield* http.execute(exports_HttpClientRequest.get(`${SEARCH_URL13}?q=${encodeURIComponent(query)}`).pipe(exports_HttpClientRequest.setHeaders({
      "User-Agent": USER_AGENT27,
      Accept: "text/html",
      "Accept-Language": "en-US,en;q=0.9"
    }))).pipe(exports_Effect.timeout(timeout3));
    if (response.status < 200 || response.status >= 400)
      return [];
    const html = yield* response.text;
    if (!html)
      return [];
    return parseSoundCloudResults(html, numResults);
  });
}
function parseSoundCloudResults(html, maxResults) {
  const results = [];
  let pos = 0;
  const itemRegex = /<li[^>]*class="[^"]*soundList__item[^"]*"[^>]*>[\s\S]*?<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi;
  let match6;
  while ((match6 = itemRegex.exec(html)) !== null) {
    if (results.length >= maxResults)
      break;
    const url = match6[1].startsWith("http") ? match6[1] : `https://soundcloud.com${match6[1]}`;
    const title = match6[2].replace(/<[^>]*>/g, "").trim();
    if (!title || !url)
      continue;
    pos++;
    results.push(makeSearchResult({
      title,
      url,
      snippet: "",
      engine: "soundcloud",
      position: pos,
      category: "music"
    }));
  }
  return results;
}

// src/search/engines/flickr.ts
var SEARCH_URL14 = "https://www.flickr.com/search";
var USER_AGENT28 = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36";
function makeFlickr(config) {
  return {
    name: config.name,
    config,
    search: (http, query, opts) => searchFlickr(http, query, opts.numResults || config.maxResults, config.timeout)
  };
}
function searchFlickr(http, query, numResults, timeout3) {
  return exports_Effect.gen(function* () {
    const response = yield* http.execute(exports_HttpClientRequest.get(`${SEARCH_URL14}?text=${encodeURIComponent(query)}`).pipe(exports_HttpClientRequest.setHeaders({
      "User-Agent": USER_AGENT28,
      Accept: "text/html",
      "Accept-Language": "en-US,en;q=0.9"
    }))).pipe(exports_Effect.timeout(timeout3));
    if (response.status < 200 || response.status >= 400)
      return [];
    const html = yield* response.text;
    if (!html)
      return [];
    return parseFlickrResults(html, numResults);
  });
}
function parseFlickrResults(html, maxResults) {
  const results = [];
  let pos = 0;
  const itemRegex = /<a[^>]*class="[^"]*overlay[^"]*"[^>]*href="([^"]*)"[^>]*>[\s\S]*?<img[^>]*alt="([^"]*)"[^>]*>/gi;
  let match6;
  while ((match6 = itemRegex.exec(html)) !== null) {
    if (results.length >= maxResults)
      break;
    const url = match6[1].startsWith("http") ? match6[1] : `https://www.flickr.com${match6[1]}`;
    const title = match6[2].trim();
    if (!title || !url)
      continue;
    pos++;
    results.push(makeSearchResult({
      title,
      url,
      snippet: "",
      engine: "flickr",
      position: pos,
      category: "image"
    }));
  }
  return results;
}

// src/search/engines/douban.ts
var SEARCH_URL15 = "https://www.douban.com/search";
var USER_AGENT29 = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36";
function makeDouban(config) {
  return {
    name: config.name,
    config,
    search: (http, query, opts) => searchDouban(http, query, opts.numResults || config.maxResults, config.timeout)
  };
}
function searchDouban(http, query, numResults, timeout3) {
  return exports_Effect.gen(function* () {
    const response = yield* http.execute(exports_HttpClientRequest.get(`${SEARCH_URL15}?q=${encodeURIComponent(query)}`).pipe(exports_HttpClientRequest.setHeaders({
      "User-Agent": USER_AGENT29,
      "Accept-Language": "zh-CN,zh;q=0.9",
      Accept: "text/html",
      Referer: "https://www.douban.com/"
    }))).pipe(exports_Effect.timeout(timeout3));
    if (response.status < 200 || response.status >= 400)
      return [];
    const html = yield* response.text;
    if (!html)
      return [];
    return parseDoubanResults(html, numResults);
  });
}
function parseDoubanResults(html, maxResults) {
  const results = [];
  let pos = 0;
  const itemRegex = /<div[^>]*class="result"[^>]*>[\s\S]*?<div[^>]*class="title"[^>]*>[\s\S]*?<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi;
  let match6;
  while ((match6 = itemRegex.exec(html)) !== null) {
    if (results.length >= maxResults)
      break;
    let url = match6[1];
    const title = match6[2].replace(/<[^>]*>/g, "").trim();
    if (!title || !url)
      continue;
    if (url.startsWith("//"))
      url = `https:${url}`;
    pos++;
    results.push(makeSearchResult({
      title,
      url,
      snippet: "",
      engine: "douban",
      position: pos
    }));
  }
  return results;
}

// src/search/engines/weibo.ts
var SEARCH_URL16 = "https://s.weibo.com/weibo";
var USER_AGENT30 = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36";
function makeWeibo(config) {
  return {
    name: config.name,
    config,
    search: (http, query, opts) => searchWeibo(http, query, opts.numResults || config.maxResults, config.timeout)
  };
}
function searchWeibo(http, query, numResults, timeout3) {
  return exports_Effect.gen(function* () {
    const response = yield* http.execute(exports_HttpClientRequest.get(`${SEARCH_URL16}?q=${encodeURIComponent(query)}`).pipe(exports_HttpClientRequest.setHeaders({
      "User-Agent": USER_AGENT30,
      "Accept-Language": "zh-CN,zh;q=0.9",
      Accept: "text/html",
      Referer: "https://s.weibo.com/"
    }))).pipe(exports_Effect.timeout(timeout3));
    if (response.status < 200 || response.status >= 400)
      return [];
    const html = yield* response.text;
    if (!html)
      return [];
    return parseWeiboResults(html, numResults);
  });
}
function parseWeiboResults(html, maxResults) {
  const results = [];
  let pos = 0;
  const itemRegex = /<div[^>]*class="[^"]*card-wrap[^"]*"[^>]*>[\s\S]*?<p[^>]*class="[^"]*txt[^"]*"[^>]*>[\s\S]*?<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi;
  let match6;
  while ((match6 = itemRegex.exec(html)) !== null) {
    if (results.length >= maxResults)
      break;
    let url = match6[1];
    const title = match6[2].replace(/<[^>]*>/g, "").trim();
    if (!title || !url)
      continue;
    if (url.startsWith("//"))
      url = `https:${url}`;
    pos++;
    results.push(makeSearchResult({
      title,
      url,
      snippet: "",
      engine: "weibo",
      position: pos,
      category: "social"
    }));
  }
  return results;
}

// src/search/engines/reddit.ts
var SEARCH_URL17 = "https://www.reddit.com/search";
var USER_AGENT31 = "opencode-search/1.0 (by /u/opencode)";
function makeReddit(config) {
  return {
    name: config.name,
    config,
    search: (http, query, opts) => searchReddit(http, query, opts.numResults || config.maxResults, config.timeout)
  };
}
function searchReddit(http, query, numResults, timeout3) {
  return exports_Effect.gen(function* () {
    const response = yield* http.execute(exports_HttpClientRequest.get(`${SEARCH_URL17}/?q=${encodeURIComponent(query)}`).pipe(exports_HttpClientRequest.setHeaders({
      "User-Agent": USER_AGENT31,
      Accept: "text/html"
    }))).pipe(exports_Effect.timeout(timeout3));
    if (response.status < 200 || response.status >= 400)
      return [];
    const html = yield* response.text;
    if (!html)
      return [];
    return parseRedditResults(html, numResults);
  });
}
function parseRedditResults(html, maxResults) {
  const results = [];
  let pos = 0;
  const itemRegex = /<a[^>]*id="[^"]*"[^>]*class="[^"]*search-result[^"]*"[^>]*href="([^"]*)"[^>]*>[\s\S]*?<faceplate-screen-reader-content>([\s\S]*?)<\/faceplate-screen-reader-content>/gi;
  let match6;
  while ((match6 = itemRegex.exec(html)) !== null) {
    if (results.length >= maxResults)
      break;
    const url = match6[1].startsWith("/r/") ? `https://www.reddit.com${match6[1]}` : match6[1];
    const title = match6[2].trim();
    if (!title || !url)
      continue;
    pos++;
    results.push(makeSearchResult({ title, url, snippet: "", engine: "reddit", position: pos, category: "social" }));
  }
  return results;
}

// src/search/engines/vimeo.ts
var SEARCH_URL18 = "https://vimeo.com/search";
var USER_AGENT32 = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36";
function makeVimeo(config) {
  return {
    name: config.name,
    config,
    search: (http, query, opts) => searchVimeo(http, query, opts.numResults || config.maxResults, config.timeout)
  };
}
function searchVimeo(http, query, numResults, timeout3) {
  return exports_Effect.gen(function* () {
    const response = yield* http.execute(exports_HttpClientRequest.get(`${SEARCH_URL18}?q=${encodeURIComponent(query)}`).pipe(exports_HttpClientRequest.setHeaders({ "User-Agent": USER_AGENT32, Accept: "text/html" }))).pipe(exports_Effect.timeout(timeout3));
    if (response.status < 200 || response.status >= 400)
      return [];
    const html = yield* response.text;
    if (!html)
      return [];
    return parseVimeoResults(html, numResults);
  });
}
function parseVimeoResults(html, maxResults) {
  const results = [];
  let pos = 0;
  const itemRegex = /<a[^>]*href="(\/[\d]+)"[^>]*class="[^"]*"[^>]*>[\s\S]*?<div[^>]*class="[^"]*title[^"]*"[^>]*>([\s\S]*?)<\/div>/gi;
  let match6;
  while ((match6 = itemRegex.exec(html)) !== null) {
    if (results.length >= maxResults)
      break;
    const url = `https://vimeo.com${match6[1]}`;
    const title = match6[2].replace(/<[^>]*>/g, "").trim();
    if (!title)
      continue;
    pos++;
    results.push(makeSearchResult({ title, url, snippet: "", engine: "vimeo", position: pos, category: "video" }));
  }
  return results;
}

// src/search/engines/stackexchange.ts
var API_URL7 = "https://api.stackexchange.com/2.3/search";
var USER_AGENT33 = "opencode-search/1.0";
function makeStackExchange(config) {
  return {
    name: config.name,
    config,
    search: (http, query, opts) => searchStackExchange(http, query, opts.numResults || config.maxResults, config.timeout)
  };
}
function searchStackExchange(http, query, numResults, timeout3) {
  return exports_Effect.gen(function* () {
    const params = new URLSearchParams({
      order: "desc",
      sort: "relevance",
      intitle: query,
      site: "stackoverflow",
      pagesize: String(Math.min(numResults, 20)),
      filter: "withbody"
    });
    const response = yield* http.execute(exports_HttpClientRequest.get(`${API_URL7}?${params.toString()}`).pipe(exports_HttpClientRequest.setHeaders({ "User-Agent": USER_AGENT33, Accept: "application/json" }))).pipe(exports_Effect.timeout(timeout3));
    if (response.status < 200 || response.status >= 400)
      return [];
    const raw2 = yield* response.text;
    if (!raw2)
      return [];
    return parseStackExchangeResults(raw2, numResults);
  });
}
function parseStackExchangeResults(raw2, maxResults) {
  const results = [];
  let data;
  try {
    data = JSON.parse(raw2);
  } catch {
    return [];
  }
  const items = data?.items;
  if (!items || !Array.isArray(items))
    return [];
  let pos = 0;
  for (const item of items) {
    if (results.length >= maxResults)
      break;
    if (!item.title || !item.link)
      continue;
    pos++;
    results.push(makeSearchResult({
      title: item.title.replace(/<[^>]*>/g, ""),
      url: item.link,
      snippet: `⭐${item.score} · \uD83D\uDCAC${item.answer_count} · \uD83D\uDC41${item.view_count}${item.tags?.length ? " · \uD83C\uDFF7" + item.tags.slice(0, 3).join(",") : ""}`,
      engine: "stackexchange",
      position: pos,
      publishedDate: item.creation_date ? item.creation_date * 1000 : undefined,
      category: "code"
    }));
  }
  return results;
}

// src/search/engines/google-news.ts
function makeGoogleNews(config) {
  return {
    name: config.name,
    config,
    search: (http, query, opts) => searchGoogleNews(http, query, opts.numResults || config.maxResults, opts.lang)
  };
}
function searchGoogleNews(http, query, maxResults, lang) {
  return exports_Effect.gen(function* () {
    const ceid = getCeid(lang);
    const params = new URLSearchParams({
      q: query,
      hl: getHl(lang),
      gl: ceid.split(":")[0],
      ceid,
      tbm: "nws"
    });
    const url = `https://news.google.com/search?${params.toString()}`;
    const response = yield* http.execute(exports_HttpClientRequest.get(url).pipe(exports_HttpClientRequest.setHeaders({
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36",
      "Accept-Language": lang?.replace("_", "-") || "en-US,en;q=0.9",
      Accept: "text/html",
      Cookie: "CONSENT=YES+"
    })));
    if (response.status < 200 || response.status >= 400)
      return [];
    const html = yield* response.text;
    if (!html)
      return [];
    if (isGoogleCaptcha(response.status, html, url))
      return [];
    return parseGoogleNewsResults(html, maxResults);
  });
}
function parseGoogleNewsResults(html, maxResults) {
  const results = [];
  const elementRegex = /<div[^>]*jslog[^>]*data-n-tid[^>]*>[\s\S]*?<\/div>/gi;
  let match6;
  while ((match6 = elementRegex.exec(html)) !== null) {
    if (results.length >= maxResults)
      break;
    const block = match6[0];
    const hrefMatch = block.match(/<a[^>]*target="_blank"[^>]*href="([^"]*)"[^>]*>/);
    if (!hrefMatch)
      continue;
    let url = hrefMatch[1];
    if (url.startsWith("./")) {
      url = "https://news.google.com" + url.slice(1);
    }
    const jslogMatch = block.match(/jslog="([^"]*)"/);
    if (jslogMatch) {
      try {
        const parts2 = jslogMatch[1].split(";");
        if (parts2.length > 1) {
          const b64Data = parts2[1].split(":").pop()?.trim();
          if (!b64Data)
            continue;
          const padded = b64Data + "=".repeat((4 - b64Data.length % 4) % 4);
          const decoded = JSON.parse(Buffer.from(padded, "base64").toString("utf-8"));
          if (Array.isArray(decoded) && typeof decoded[decoded.length - 1] === "string" && decoded[decoded.length - 1].startsWith("http")) {
            url = decoded[decoded.length - 1];
          }
        }
      } catch {}
    }
    const titleMatch = block.match(/<h4[^>]*>([\s\S]*?)<\/h4>/);
    const title = titleMatch ? titleMatch[1].replace(/<[^>]*>/g, "").trim() : "";
    if (!title)
      continue;
    const pubDateMatch = block.match(/<time[^>]*>([\s\S]*?)<\/time>/);
    const pubOriginMatch = block.match(/<div[^>]*class="vr1PYe"[^>]*>([\s\S]*?)<\/div>/);
    const pubDate = pubDateMatch ? pubDateMatch[1].trim() : "";
    const pubOrigin = pubOriginMatch ? pubOriginMatch[1].trim() : "";
    const snippet = [pubOrigin, pubDate].filter(Boolean).join(" / ");
    const thumbnailMatch = block.match(/<figure><img[^>]*src="([^"]*)"[^>]*>/);
    let thumbnail = thumbnailMatch ? thumbnailMatch[1] : "";
    if (thumbnail && thumbnail.startsWith("/")) {
      thumbnail = "https://news.google.com" + thumbnail;
    }
    results.push(makeSearchResult({
      title,
      url,
      snippet: snippet || "",
      engine: "google-news",
      position: results.length + 1,
      category: "news",
      publishedDate: pubDate ? parseGoogleNewsDate(pubDate) : undefined
    }));
  }
  return results;
}
function parseGoogleNewsDate(dateStr) {
  const relative = /(\d+)\s+(minute|hour|day|week|month|year)s?\s+ago/i.exec(dateStr);
  if (relative) {
    const num = parseInt(relative[1]);
    const unit = relative[2];
    const now = Date.now();
    const multipliers = {
      minute: 60000,
      hour: 3600000,
      day: 86400000,
      week: 604800000,
      month: 2592000000,
      year: 31536000000
    };
    return now - num * (multipliers[unit] || 0);
  }
  const parsed = new Date(dateStr);
  if (!isNaN(parsed.getTime()))
    return parsed.getTime();
  return;
}
var CEID_LIST = {
  zh: "CN:zh-Hans",
  en: "US:en",
  ja: "JP:ja",
  ko: "KR:ko",
  de: "DE:de",
  fr: "FR:fr",
  es: "ES:es",
  pt: "BR:pt-419",
  it: "IT:it",
  ru: "RU:ru",
  ar: "SA:ar"
};
function getCeid(lang) {
  if (!lang)
    return "US:en";
  const shortLang = lang.split("-")[0].split("_")[0];
  return CEID_LIST[shortLang] || "US:en";
}
function getHl(lang) {
  if (!lang)
    return "en";
  return lang.split("_")[0].replace("-", "-");
}

// src/search/engines/youtube.ts
function makeYouTube(config) {
  return {
    name: config.name,
    config,
    search: (http, query, opts) => searchYouTube(http, query, opts.numResults || config.maxResults, opts.timeRange, opts.lang)
  };
}
function searchYouTube(http, query, maxResults, timeRange, lang) {
  return exports_Effect.gen(function* () {
    const searchParams = new URLSearchParams({
      search_query: query,
      sp: getTimeRangeParam(timeRange)
    });
    if (lang) {
      searchParams.set("gl", lang.split("-")[0].split("_")[0]);
    }
    const url = `https://www.youtube.com/results?${searchParams.toString()}`;
    const response = yield* http.execute(exports_HttpClientRequest.get(url).pipe(exports_HttpClientRequest.setHeaders({
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36",
      "Accept-Language": lang?.replace("_", "-") || "en-US,en;q=0.9",
      Accept: "text/html",
      Cookie: "CONSENT=YES+"
    })));
    if (response.status < 200 || response.status >= 400)
      return [];
    const html = yield* response.text;
    if (!html)
      return [];
    return parseYouTubeResults(html, maxResults);
  });
}
function parseYouTubeResults(html, maxResults) {
  const results = [];
  const jsonMatch = html.match(/var ytInitialData\s*=\s*(\{[\s\S]*?\});?\s*<\/script>/);
  if (jsonMatch) {
    try {
      const data = JSON.parse(jsonMatch[1]);
      const contents = data?.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents?.[0]?.itemSectionRenderer?.contents;
      if (contents && Array.isArray(contents)) {
        for (const item of contents) {
          if (results.length >= maxResults)
            break;
          const videoRenderer = item.videoRenderer;
          if (!videoRenderer)
            continue;
          const videoId = videoRenderer.videoId;
          const title = videoRenderer.title?.runs?.[0]?.text || "";
          const channelName = videoRenderer.ownerText?.runs?.[0]?.text || "";
          const viewCount = videoRenderer.viewCountText?.simpleText || "";
          const publishedTime = videoRenderer.publishedTimeText?.simpleText || "";
          const durationText = videoRenderer.lengthText?.simpleText || "";
          if (!title || !videoId)
            continue;
          const url = `https://www.youtube.com/watch?v=${videoId}`;
          const snippet = [
            channelName,
            viewCount,
            publishedTime,
            durationText
          ].filter(Boolean).join(" · ");
          results.push(makeSearchResult({
            title,
            url,
            snippet,
            engine: "youtube",
            position: results.length + 1,
            category: "video",
            publishedDate: publishedTime ? parseRelativeDate(publishedTime) : undefined
          }));
        }
        return results.slice(0, maxResults);
      }
    } catch {}
  }
  const videoRegex = /<a[^>]*href="\/watch\?v=([a-zA-Z0-9_-]{11})"[^>]*>[\s\S]*?<\/a>/g;
  const seen = new Set;
  let match6;
  while ((match6 = videoRegex.exec(html)) !== null) {
    if (results.length >= maxResults)
      break;
    const videoId = match6[1];
    if (seen.has(videoId))
      continue;
    seen.add(videoId);
    const titleMatch = match6[0].match(/aria-label="([^"]+)"/);
    const title = titleMatch ? titleMatch[1].trim() : "";
    if (!title)
      continue;
    const url = `https://www.youtube.com/watch?v=${videoId}`;
    results.push(makeSearchResult({
      title,
      url,
      snippet: "",
      engine: "youtube",
      position: results.length + 1,
      category: "video"
    }));
  }
  return results;
}
function getTimeRangeParam(timeRange) {
  switch (timeRange) {
    case "day":
      return "EgIIBQ%3D%3D";
    case "week":
      return "EgIIBA%3D%3D";
    case "month":
      return "EgIIAw%3D%3D";
    case "year":
      return "EgIIAg%3D%3D";
    default:
      return "";
  }
}

// src/search/engines/google-scholar.ts
function makeGoogleScholar(config) {
  return {
    name: config.name,
    config,
    search: (http, query, opts) => searchGoogleScholar(http, query, opts.numResults || config.maxResults, opts.lang)
  };
}
function searchGoogleScholar(http, query, maxResults, lang) {
  return exports_Effect.gen(function* () {
    const hl = lang?.split("-")[0].split("_")[0] || "en";
    const params = new URLSearchParams({
      q: query,
      hl,
      num: String(Math.min(maxResults, 10)),
      as_sdt: "0",
      scisbd: "1"
    });
    const url = `https://scholar.google.com/scholar?${params.toString()}`;
    const response = yield* http.execute(exports_HttpClientRequest.get(url).pipe(exports_HttpClientRequest.setHeaders({
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36",
      "Accept-Language": lang?.replace("_", "-") || "en-US,en;q=0.9",
      Accept: "text/html",
      Cookie: "CONSENT=YES+"
    })));
    if (response.status < 200 || response.status >= 400)
      return [];
    const html = yield* response.text;
    if (!html)
      return [];
    if (isGoogleCaptcha(response.status, html, url))
      return [];
    return parseGoogleScholarResults(html, maxResults);
  });
}
function parseGoogleScholarResults(html, maxResults) {
  const results = [];
  const blockRegex = /<div[^>]*class="gs_ri"[^>]*>[\s\S]*?(?=<div[^>]*class="gs_ri"|$)/g;
  let match6;
  while ((match6 = blockRegex.exec(html)) !== null) {
    if (results.length >= maxResults)
      break;
    const block = match6[0];
    const titleMatch = block.match(/<h3[^>]*>[\s\S]*?<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/i);
    if (!titleMatch)
      continue;
    const url = titleMatch[1];
    const title = titleMatch[2].replace(/<[^>]*>/g, "").trim();
    if (!title || !url)
      continue;
    const authorMatch = block.match(/<div[^>]*class="gs_a"[^>]*>([\s\S]*?)<\/div>/i);
    const authorInfo = authorMatch ? authorMatch[1].replace(/<[^>]*>/g, "").trim() : "";
    const snippetMatch = block.match(/<div[^>]*class="gs_rs"[^>]*>([\s\S]*?)<\/div>/i);
    const snippet = snippetMatch ? snippetMatch[1].replace(/<[^>]*>/g, "").trim() : "";
    const citationsMatch = block.match(/Cited by (\d+)/);
    const citations = citationsMatch ? citationsMatch[1] : "";
    const parts2 = [authorInfo, snippet].filter(Boolean);
    if (citations)
      parts2.push(`被引用: ${citations}`);
    const fullSnippet = parts2.join(" | ").slice(0, 300);
    const yearMatch = authorInfo.match(/(\d{4})/);
    const year = yearMatch ? parseInt(yearMatch[1]) : undefined;
    const publishedDate = year && year > 1900 && year < 2100 ? new Date(year, 0, 1).getTime() : undefined;
    results.push(makeSearchResult({
      title,
      url,
      snippet: fullSnippet,
      engine: "google-scholar",
      position: results.length + 1,
      category: "academic",
      publishedDate
    }));
  }
  return results;
}

// src/search/engines/twitter.ts
var NITTER_INSTANCES = [
  "https://nitter.net",
  "https://nitter.privacydev.net",
  "https://nitter.poast.org"
];
function makeTwitter(config) {
  return {
    name: config.name,
    config,
    search: (http, query, opts) => searchTwitter(http, query, opts.numResults || config.maxResults, opts.timeRange)
  };
}
function searchTwitter(http, query, maxResults, timeRange) {
  return exports_Effect.gen(function* () {
    for (const instance of NITTER_INSTANCES) {
      const result3 = yield* tryNitterSearch(http, instance, query, maxResults, timeRange);
      if (result3.length > 0)
        return result3;
    }
    return yield* tryTwitterDirect(http, query, maxResults);
  });
}
function tryNitterSearch(http, instance, query, maxResults, timeRange) {
  return exports_Effect.gen(function* () {
    const params = new URLSearchParams({
      q: query,
      f: "tweets"
    });
    if (timeRange) {
      params.set("f", "tweets");
    }
    const url = `${instance}/search?${params.toString()}`;
    const response = yield* http.execute(exports_HttpClientRequest.get(url).pipe(exports_HttpClientRequest.setHeaders({
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      Accept: "text/html"
    })));
    if (response.status < 200 || response.status >= 400)
      return [];
    const html = yield* response.text;
    if (!html)
      return [];
    return parseNitterResults(html, maxResults);
  });
}
function parseNitterResults(html, maxResults) {
  const results = [];
  const itemRegex = /<div[^>]*class="timeline-item"[^>]*>[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/g;
  let match6;
  while ((match6 = itemRegex.exec(html)) !== null) {
    if (results.length >= maxResults)
      break;
    const block = match6[0];
    const userMatch = block.match(/<span[^>]*class="username"[^>]*>([\s\S]*?)<\/span>/i);
    const username = userMatch ? userMatch[1].trim().replace("@", "") : "";
    const contentMatch = block.match(/<div[^>]*class="tweet-content"[^>]*>([\s\S]*?)<\/div>/i);
    const content = contentMatch ? contentMatch[1].replace(/<[^>]*>/g, "").trim() : "";
    const linkMatch = block.match(/<a[^>]*href="\/[\w]+\/status\/(\d+)"[^>]*>/i);
    if (!linkMatch)
      continue;
    const tweetId = linkMatch[1];
    const dateMatch = block.match(/<a[^>]*class="tweet-date"[^>]*>[\s\S]*?<\/a>/i);
    const dateStr = dateMatch ? dateMatch[1].replace(/<[^>]*>/g, "").trim() : "";
    const statsMatch = block.match(/<div[^>]*class="tweet-stat"[^>]*>[\s\S]*?<\/div>/gi);
    const stats = statsMatch ? statsMatch.map((s) => s.replace(/<[^>]*>/g, "").trim()).join(" ") : "";
    const title = username ? `@${username}` : "Tweet";
    const snippet = [content, dateStr, stats].filter(Boolean).join(" | ");
    const url = `https://x.com/${username}/status/${tweetId}`;
    results.push(makeSearchResult({
      title,
      url,
      snippet: snippet.slice(0, 300),
      engine: "twitter",
      position: results.length + 1,
      category: "social",
      publishedDate: dateStr ? parseRelativeDate(dateStr) : undefined
    }));
  }
  return results;
}
function tryTwitterDirect(http, query, maxResults) {
  return exports_Effect.gen(function* () {
    const params = new URLSearchParams({
      q: query,
      src: "typed_query",
      f: "live"
    });
    const url = `https://x.com/search?${params.toString()}`;
    const response = yield* http.execute(exports_HttpClientRequest.get(url).pipe(exports_HttpClientRequest.setHeaders({
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      Accept: "text/html",
      Cookie: "guest_id=; gt=1"
    })));
    if (response.status < 200 || response.status >= 400)
      return [];
    const html = yield* response.text;
    if (!html)
      return [];
    return parseTwitterDirectResults(html, maxResults);
  });
}
function parseTwitterDirectResults(html, maxResults) {
  const results = [];
  const jsonMatch = html.match(/"globalObjects"\s*:\s*(\{[\s\S]*?\})\s*[,}]?\s*\}/);
  if (jsonMatch) {
    try {
      const data = JSON.parse(jsonMatch[1]);
      const tweets = data.tweets;
      if (tweets && typeof tweets === "object") {
        const tweetList = Object.values(tweets);
        for (const t of tweetList.slice(0, maxResults)) {
          if (!t.full_text)
            continue;
          const username = t.user_screen_name || "";
          const url = `https://x.com/${username}/status/${t.id_str}`;
          const title = username ? `@${username}` : "Tweet";
          const snippet = t.full_text.slice(0, 300);
          results.push(makeSearchResult({
            title,
            url,
            snippet,
            engine: "twitter",
            position: results.length + 1,
            category: "social",
            publishedDate: t.created_at ? new Date(t.created_at).getTime() : undefined
          }));
        }
      }
    } catch {}
  }
  return results;
}

// src/search/engines/huggingface.ts
var BASE_URL2 = "https://huggingface.co";
var USER_AGENT34 = "opencode-search/1.0";
function makeHuggingFace(config, endpoint = "models") {
  return {
    name: config.name,
    config,
    search: (http, query, opts) => searchHuggingFace(http, query, opts.numResults || config.maxResults, config.timeout, endpoint)
  };
}
function searchHuggingFace(http, query, numResults, timeout3, endpoint) {
  return exports_Effect.gen(function* () {
    const params = new URLSearchParams({
      search: query,
      direction: "-1"
    });
    const response = yield* http.execute(exports_HttpClientRequest.get(`${BASE_URL2}/api/${endpoint}?${params.toString()}`).pipe(exports_HttpClientRequest.setHeaders({
      "User-Agent": USER_AGENT34,
      Accept: "application/json"
    }))).pipe(exports_Effect.timeout(timeout3));
    if (response.status < 200 || response.status >= 400)
      return [];
    const raw2 = yield* response.text;
    if (!raw2)
      return [];
    return parseHuggingFaceResults(raw2, numResults, endpoint);
  });
}
function parseHuggingFaceResults(raw2, maxResults, endpoint) {
  let parsed;
  try {
    parsed = JSON.parse(raw2);
  } catch {
    return [];
  }
  const entries = parsed;
  if (!Array.isArray(entries))
    return [];
  const results = [];
  let pos = 0;
  for (const entry of entries) {
    if (results.length >= maxResults)
      break;
    const id = entry.id;
    if (!id)
      continue;
    const url = endpoint === "models" ? `${BASE_URL2}/${id}` : `${BASE_URL2}/${endpoint}/${id}`;
    const parts2 = [];
    if (entry.likes)
      parts2.push(`${entry.likes} likes`);
    if (entry.downloads)
      parts2.push(`${entry.downloads.toLocaleString()} downloads`);
    if (entry.pipeline_tag)
      parts2.push(entry.pipeline_tag);
    if (entry.library_name)
      parts2.push(entry.library_name);
    if (entry.tags?.length)
      parts2.push(entry.tags.slice(0, 3).join(", "));
    const snippet = parts2.join(" · ");
    const publishedDate = entry.lastModified ? new Date(entry.lastModified).getTime() : entry.createdAt ? new Date(entry.createdAt).getTime() : undefined;
    pos++;
    results.push(makeSearchResult({
      title: id,
      url,
      snippet: entry.description || snippet,
      engine: "huggingface",
      position: pos,
      publishedDate,
      category: "code"
    }));
  }
  return results;
}

// src/search/engines/gitlab.ts
var USER_AGENT35 = "opencode-search/1.0";
function makeGitLab(config, baseUrl2 = "https://gitlab.com") {
  return {
    name: config.name,
    config,
    search: (http, query, opts) => searchGitLab(http, query, opts.numResults || config.maxResults, config.timeout, baseUrl2)
  };
}
function searchGitLab(http, query, numResults, timeout3, baseUrl2) {
  return exports_Effect.gen(function* () {
    const params = new URLSearchParams({
      search: query,
      per_page: String(Math.min(numResults, 50)),
      order_by: "stars",
      sort: "desc"
    });
    const headers = {
      "User-Agent": USER_AGENT35,
      Accept: "application/json"
    };
    const token = process.env.GITLAB_TOKEN;
    if (token)
      headers["PRIVATE-TOKEN"] = token;
    const response = yield* http.execute(exports_HttpClientRequest.get(`${baseUrl2}/api/v4/projects?${params.toString()}`).pipe(exports_HttpClientRequest.setHeaders(headers))).pipe(exports_Effect.timeout(timeout3));
    if (response.status < 200 || response.status >= 400)
      return [];
    const raw2 = yield* response.text;
    if (!raw2)
      return [];
    return parseGitLabResults(raw2, numResults);
  });
}
function parseGitLabResults(raw2, maxResults) {
  let parsed;
  try {
    parsed = JSON.parse(raw2);
  } catch {
    return [];
  }
  const items = parsed;
  if (!Array.isArray(items))
    return [];
  const results = [];
  let pos = 0;
  for (const item of items) {
    if (results.length >= maxResults)
      break;
    const url = item.web_url;
    const name = item.path_with_namespace || item.name;
    if (!url || !name)
      continue;
    const parts2 = [];
    if (item.star_count)
      parts2.push(`${item.star_count} stars`);
    if (item.forks_count)
      parts2.push(`${item.forks_count} forks`);
    if (item.topics?.length)
      parts2.push(item.topics.slice(0, 3).join(", "));
    const snippet = parts2.length > 0 ? `[${parts2.join(" · ")}] ${item.description || ""}`.trim() : item.description || "";
    pos++;
    results.push(makeSearchResult({
      title: `⭐${item.star_count || 0} ${name}`,
      url,
      snippet: snippet.slice(0, 300),
      engine: "gitlab",
      position: pos,
      publishedDate: item.last_activity_at ? new Date(item.last_activity_at).getTime() : undefined,
      category: "code"
    }));
  }
  return results;
}

// src/search/engines/imdb.ts
var SUGGESTION_URL = "https://v2.sg.media-imdb.com/suggestion";
var USER_AGENT36 = "opencode-search/1.0";
function makeIMDb(config) {
  return {
    name: config.name,
    config,
    search: (http, query, opts) => searchIMDb(http, query, opts.numResults || config.maxResults, config.timeout)
  };
}
function searchIMDb(http, query, numResults, timeout3) {
  return exports_Effect.gen(function* () {
    const normalizedQuery = query.replace(/\s+/g, "_").toLowerCase();
    const letter = normalizedQuery[0] || "a";
    const response = yield* http.execute(exports_HttpClientRequest.get(`${SUGGESTION_URL}/${letter}/${encodeURIComponent(normalizedQuery)}.json`).pipe(exports_HttpClientRequest.setHeaders({
      "User-Agent": USER_AGENT36,
      Accept: "application/json"
    }))).pipe(exports_Effect.timeout(timeout3));
    if (response.status < 200 || response.status >= 400)
      return [];
    const raw2 = yield* response.text;
    if (!raw2)
      return [];
    return parseIMDbResults(raw2, numResults);
  });
}
var CATEGORY_MAP = {
  nm: "name",
  tt: "title",
  kw: "keyword",
  co: "company",
  ep: "episode"
};
function parseIMDbResults(raw2, maxResults) {
  let parsed;
  try {
    parsed = JSON.parse(raw2);
  } catch {
    return [];
  }
  const data = parsed;
  const entries = data?.d;
  if (!Array.isArray(entries))
    return [];
  const results = [];
  let pos = 0;
  for (const entry of entries) {
    if (results.length >= maxResults)
      break;
    const entryId = entry.id;
    const category = CATEGORY_MAP[entryId?.substring(0, 2)];
    if (!category)
      continue;
    let title = entry.l || "";
    if (entry.q)
      title += ` (${entry.q})`;
    if (!title)
      continue;
    const parts2 = [];
    if (entry.rank)
      parts2.push(`#${entry.rank}`);
    if (entry.y)
      parts2.push(String(entry.y));
    if (entry.s)
      parts2.push(entry.s);
    const url = `https://www.imdb.com/${category}/${entryId}`;
    let thumbnail;
    if (entry.i?.imageUrl) {
      const baseUrl2 = entry.i.imageUrl.replace(/\._V1_.*$/, "");
      thumbnail = `${baseUrl2}._V1_UX280_CR0,0,280,414_.jpg`;
    }
    pos++;
    results.push(makeSearchResult({
      title,
      url,
      snippet: parts2.join(" · "),
      engine: "imdb",
      position: pos,
      publishedDate: entry.y ? new Date(`${entry.y}-01-01`).getTime() : undefined,
      category: "video"
    }));
  }
  return results;
}

// src/search/engines/google-play.ts
var BASE_URL3 = "https://play.google.com";
var USER_AGENT37 = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
function makeGooglePlay(config) {
  return {
    name: config.name,
    config,
    search: (http, query, opts) => searchGooglePlay(http, query, opts.numResults || config.maxResults, config.timeout)
  };
}
function searchGooglePlay(http, query, numResults, timeout3) {
  return exports_Effect.gen(function* () {
    const params = new URLSearchParams({ q: query, c: "apps" });
    const response = yield* http.execute(exports_HttpClientRequest.get(`${BASE_URL3}/store/search?${params.toString()}`).pipe(exports_HttpClientRequest.setHeaders({
      "User-Agent": USER_AGENT37,
      Accept: "text/html"
    }))).pipe(exports_Effect.timeout(timeout3));
    if (response.status < 200 || response.status >= 400)
      return [];
    const html = yield* response.text;
    if (!html)
      return [];
    return parseGooglePlayResults(html, numResults);
  });
}
function parseGooglePlayResults(html, maxResults) {
  const results = [];
  let pos = 0;
  const appLinkRegex = /href="\/store\/apps\/details\?id=([^"&]+)[^"]*"[^>]*>[\s\S]*?<span[^>]*>([^<]+)<\/span>/gi;
  let match6;
  const seen = new Set;
  while ((match6 = appLinkRegex.exec(html)) !== null) {
    if (results.length >= maxResults)
      break;
    const appId = match6[1];
    const title = match6[2].trim();
    if (!appId || !title || seen.has(appId))
      continue;
    seen.add(appId);
    const url = `${BASE_URL3}/store/apps/details?id=${appId}`;
    pos++;
    results.push(makeSearchResult({
      title,
      url,
      snippet: `Google Play · ${appId}`,
      engine: "google-play",
      position: pos,
      category: "apps"
    }));
  }
  if (results.length === 0) {
    const jsonLdRegex = /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi;
    while ((match6 = jsonLdRegex.exec(html)) !== null) {
      if (results.length >= maxResults)
        break;
      try {
        const data = JSON.parse(match6[1]);
        if (data.name && data.url) {
          pos++;
          results.push(makeSearchResult({
            title: data.name,
            url: data.url.startsWith("http") ? data.url : `${BASE_URL3}${data.url}`,
            snippet: data.description || "Google Play",
            engine: "google-play",
            position: pos,
            category: "apps"
          }));
        }
      } catch {}
    }
  }
  if (results.length === 0) {
    const genericRegex = /\/store\/apps\/details\?id=([a-zA-Z0-9._]+)/g;
    while ((match6 = genericRegex.exec(html)) !== null) {
      if (results.length >= maxResults)
        break;
      const appId = match6[1];
      if (seen.has(appId))
        continue;
      seen.add(appId);
      pos++;
      results.push(makeSearchResult({
        title: appId,
        url: `${BASE_URL3}/store/apps/details?id=${appId}`,
        snippet: "Google Play App",
        engine: "google-play",
        position: pos,
        category: "apps"
      }));
    }
  }
  return results;
}

// src/search/engines/goodreads.ts
var BASE_URL4 = "https://www.goodreads.com";
var USER_AGENT38 = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
function makeGoodreads(config) {
  return {
    name: config.name,
    config,
    search: (http, query, opts) => searchGoodreads(http, query, opts.numResults || config.maxResults, config.timeout)
  };
}
function searchGoodreads(http, query, numResults, timeout3) {
  return exports_Effect.gen(function* () {
    const params = new URLSearchParams({ q: query });
    const response = yield* http.execute(exports_HttpClientRequest.get(`${BASE_URL4}/search?${params.toString()}`).pipe(exports_HttpClientRequest.setHeaders({
      "User-Agent": USER_AGENT38,
      Accept: "text/html"
    }))).pipe(exports_Effect.timeout(timeout3));
    if (response.status < 200 || response.status >= 400)
      return [];
    const html = yield* response.text;
    if (!html)
      return [];
    return parseGoodreadsResults(html, numResults);
  });
}
function parseGoodreadsResults(html, maxResults) {
  const results = [];
  let pos = 0;
  const rowRegex = /<tr[^>]*>[\s\S]*?<a[^>]*class="[^"]*bookTitle[^"]*"[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<a[^>]*class="[^"]*authorName[^"]*"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<\/tr>/gi;
  let match6;
  while ((match6 = rowRegex.exec(html)) !== null) {
    if (results.length >= maxResults)
      break;
    let bookUrl = match6[1].trim();
    const titleRaw = match6[2].replace(/<[^>]+>/g, "").trim();
    const author = match6[3].replace(/<[^>]+>/g, "").trim();
    if (!titleRaw)
      continue;
    if (bookUrl.startsWith("/"))
      bookUrl = `${BASE_URL4}${bookUrl}`;
    const thumbMatch = match6[0].match(/<img[^>]*src="([^"]*)"[^>]*class="[^"]*bookCover[^"]*"/i);
    const thumbnail = thumbMatch?.[1];
    pos++;
    results.push(makeSearchResult({
      title: titleRaw,
      url: bookUrl,
      snippet: author ? `by ${author}` : "",
      engine: "goodreads",
      position: pos,
      category: "books"
    }));
  }
  if (results.length === 0) {
    const fallbackRegex = /<a[^>]*class="[^"]*bookTitle[^"]*"[^>]*href="([^"]*)"[^>]*>[\s\S]*?<span[^>]*>([^<]+)<\/span>/gi;
    while ((match6 = fallbackRegex.exec(html)) !== null) {
      if (results.length >= maxResults)
        break;
      let bookUrl = match6[1].trim();
      const title = match6[2].trim();
      if (!title)
        continue;
      if (bookUrl.startsWith("/"))
        bookUrl = `${BASE_URL4}${bookUrl}`;
      pos++;
      results.push(makeSearchResult({
        title,
        url: bookUrl,
        snippet: "Goodreads",
        engine: "goodreads",
        position: pos,
        category: "books"
      }));
    }
  }
  return results;
}

// src/search/engines/crates.ts
var API_URL8 = "https://crates.io/api/v1/crates";
var USER_AGENT39 = "opencode-search/1.0";
function makeCrates(config) {
  return {
    name: config.name,
    config,
    search: (http, query, opts) => searchCrates(http, query, opts.numResults || config.maxResults, config.timeout)
  };
}
function searchCrates(http, query, numResults, timeout3) {
  return exports_Effect.gen(function* () {
    const params = new URLSearchParams({
      q: query,
      per_page: String(Math.min(numResults, 50))
    });
    const response = yield* http.execute(exports_HttpClientRequest.get(`${API_URL8}?${params.toString()}`).pipe(exports_HttpClientRequest.setHeaders({
      "User-Agent": USER_AGENT39,
      Accept: "application/json"
    }))).pipe(exports_Effect.timeout(timeout3));
    if (response.status < 200 || response.status >= 400)
      return [];
    const raw2 = yield* response.text;
    if (!raw2)
      return [];
    return parseCratesResults(raw2, numResults);
  });
}
function parseCratesResults(raw2, maxResults) {
  let parsed;
  try {
    parsed = JSON.parse(raw2);
  } catch {
    return [];
  }
  const data = parsed;
  const crates = data?.crates;
  if (!Array.isArray(crates))
    return [];
  const results = [];
  let pos = 0;
  for (const crate of crates) {
    if (results.length >= maxResults)
      break;
    if (!crate.name)
      continue;
    const version2 = crate.newest_version || crate.max_version || crate.max_stable_version || "";
    const parts2 = [];
    if (version2)
      parts2.push(`v${version2}`);
    if (crate.downloads)
      parts2.push(`${crate.downloads.toLocaleString()} downloads`);
    if (crate.keywords?.length)
      parts2.push(crate.keywords.slice(0, 3).join(", "));
    const snippet = parts2.length > 0 ? `[${parts2.join(" · ")}] ${crate.description || ""}`.trim() : crate.description || "";
    pos++;
    results.push(makeSearchResult({
      title: `${crate.name}${version2 ? ` v${version2}` : ""}`,
      url: `https://crates.io/crates/${crate.name}`,
      snippet: snippet.slice(0, 300),
      engine: "crates",
      position: pos,
      publishedDate: crate.updated_at ? new Date(crate.updated_at).getTime() : undefined,
      category: "code"
    }));
  }
  return results;
}

// src/search/engines/pypi.ts
var BASE_URL5 = "https://pypi.org";
var USER_AGENT40 = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
function makePyPIHtml(config) {
  return {
    name: config.name,
    config,
    search: (http, query, opts) => searchPyPI(http, query, opts.numResults || config.maxResults, config.timeout)
  };
}
function searchPyPI(http, query, numResults, timeout3) {
  return exports_Effect.gen(function* () {
    const params = new URLSearchParams({ q: query });
    const response = yield* http.execute(exports_HttpClientRequest.get(`${BASE_URL5}/search?${params.toString()}`).pipe(exports_HttpClientRequest.setHeaders({
      "User-Agent": USER_AGENT40,
      Accept: "text/html"
    }))).pipe(exports_Effect.timeout(timeout3));
    if (response.status < 200 || response.status >= 400)
      return [];
    const html = yield* response.text;
    if (!html)
      return [];
    return parsePyPIResults(html, numResults);
  });
}
function parsePyPIResults(html, maxResults) {
  const results = [];
  let pos = 0;
  const snippetRegex = /<a[^>]*class="[^"]*package-snippet[^"]*"[^>]*href="([^"]*)"[^>]*>[\s\S]*?<span[^>]*class="[^"]*package-snippet__name[^"]*"[^>]*>([^<]+)<\/span>[\s\S]*?<span[^>]*class="[^"]*package-snippet__version[^"]*"[^>]*>([^<]+)<\/span>[\s\S]*?<p[^>]*>([^<]*)<\/p>/gi;
  let match6;
  while ((match6 = snippetRegex.exec(html)) !== null) {
    if (results.length >= maxResults)
      break;
    const href = match6[1].trim();
    const name = match6[2].trim();
    const version2 = match6[3].trim();
    const description = match6[4].trim();
    if (!name)
      continue;
    const url = href.startsWith("/") ? `${BASE_URL5}${href}` : href;
    pos++;
    results.push(makeSearchResult({
      title: `${name} v${version2}`,
      url,
      snippet: description || "PyPI package",
      engine: "pypi",
      position: pos,
      category: "code"
    }));
  }
  if (results.length === 0) {
    const fallbackRegex = /href="\/project\/([^/"]+)\/"[^>]*>[\s\S]*?<span[^>]*>([^<]+)<\/span>[\s\S]*?<span[^>]*>([^<]+)<\/span>/gi;
    while ((match6 = fallbackRegex.exec(html)) !== null) {
      if (results.length >= maxResults)
        break;
      const packageName = match6[1];
      const name = match6[2].trim();
      const version2 = match6[3].trim();
      if (!name || !packageName)
        continue;
      pos++;
      results.push(makeSearchResult({
        title: `${name} v${version2}`,
        url: `${BASE_URL5}/project/${packageName}/`,
        snippet: "PyPI Python package",
        engine: "pypi",
        position: pos,
        category: "code"
      }));
    }
  }
  return results;
}

// src/search/engines/openlibrary.ts
var API_URL9 = "https://openlibrary.org/search.json";
var BASE_URL6 = "https://openlibrary.org";
var USER_AGENT41 = "opencode-search/1.0";
function makeOpenLibrary(config) {
  return {
    name: config.name,
    config,
    search: (http, query, opts) => searchOpenLibrary(http, query, opts.numResults || config.maxResults, config.timeout)
  };
}
function searchOpenLibrary(http, query, numResults, timeout3) {
  return exports_Effect.gen(function* () {
    const params = new URLSearchParams({
      q: query,
      limit: String(Math.min(numResults, 50)),
      fields: "*"
    });
    const response = yield* http.execute(exports_HttpClientRequest.get(`${API_URL9}?${params.toString()}`).pipe(exports_HttpClientRequest.setHeaders({
      "User-Agent": USER_AGENT41,
      Accept: "application/json"
    }))).pipe(exports_Effect.timeout(timeout3));
    if (response.status < 200 || response.status >= 400)
      return [];
    const raw2 = yield* response.text;
    if (!raw2)
      return [];
    return parseOpenLibraryResults(raw2, numResults);
  });
}
function parseOpenLibraryResults(raw2, maxResults) {
  let parsed;
  try {
    parsed = JSON.parse(raw2);
  } catch {
    return [];
  }
  const data = parsed;
  const books = data?.docs;
  if (!Array.isArray(books))
    return [];
  const results = [];
  let pos = 0;
  for (const book of books) {
    if (results.length >= maxResults)
      break;
    if (!book.title || !book.key)
      continue;
    const url = `${BASE_URL6}${book.key}`;
    const authors = book.author_name?.slice(0, 3).join(", ") || "";
    const year = book.first_publish_year || "";
    const firstSentence = book.first_sentence?.[0] || "";
    const parts2 = [];
    if (authors)
      parts2.push(authors);
    if (year)
      parts2.push(String(year));
    if (book.isbn?.length)
      parts2.push(`ISBN: ${book.isbn[0]}`);
    let thumbnail;
    if (book.lending_identifier_s) {
      thumbnail = `https://archive.org/services/img/${book.lending_identifier_s}`;
    }
    pos++;
    results.push(makeSearchResult({
      title: `${book.title}${year ? ` (${year})` : ""}`,
      url,
      snippet: parts2.join(" · ") || "Open Library book",
      engine: "openlibrary",
      position: pos,
      publishedDate: book.first_publish_year ? new Date(`${book.first_publish_year}-01-01`).getTime() : undefined,
      category: "books"
    }));
  }
  return results;
}

// src/search/engines/wallhaven.ts
var API_URL10 = "https://wallhaven.cc/api/v1/search";
var USER_AGENT42 = "opencode-search/1.0";
function makeWallhaven(config) {
  return {
    name: config.name,
    config,
    search: (http, query, opts) => searchWallhaven(http, query, opts.numResults || config.maxResults, config.timeout)
  };
}
function searchWallhaven(http, query, numResults, timeout3) {
  return exports_Effect.gen(function* () {
    const params = new URLSearchParams({
      q: query,
      purity: "110"
    });
    const response = yield* http.execute(exports_HttpClientRequest.get(`${API_URL10}?${params.toString()}`).pipe(exports_HttpClientRequest.setHeaders({
      "User-Agent": USER_AGENT42,
      Accept: "application/json"
    }))).pipe(exports_Effect.timeout(timeout3));
    if (response.status < 200 || response.status >= 400)
      return [];
    const raw2 = yield* response.text;
    if (!raw2)
      return [];
    return parseWallhavenResults(raw2, numResults);
  });
}
function parseWallhavenResults(raw2, maxResults) {
  let parsed;
  try {
    parsed = JSON.parse(raw2);
  } catch {
    return [];
  }
  const data = parsed;
  const entries = data?.data;
  if (!Array.isArray(entries))
    return [];
  const results = [];
  let pos = 0;
  for (const entry of entries) {
    if (results.length >= maxResults)
      break;
    if (!entry.url)
      continue;
    const sizeKB = entry.file_size ? (entry.file_size / 1024).toFixed(1) : "";
    pos++;
    results.push(makeSearchResult({
      title: `${entry.category} · ${entry.resolution} · ${entry.file_type}`,
      url: entry.url,
      snippet: `${entry.category} / ${entry.purity} · ${sizeKB} KB`,
      engine: "wallhaven",
      position: pos,
      publishedDate: entry.created_at ? new Date(entry.created_at).getTime() : undefined,
      category: "image"
    }));
  }
  return results;
}

// src/search/engines/crossref.ts
var API_URL11 = "https://api.crossref.org/works";
var USER_AGENT43 = "opencode-search/1.0 (mailto:search@opencode.ai)";
function makeCrossRef(config) {
  return {
    name: config.name,
    config,
    search: (http, query, opts) => searchCrossRef(http, query, opts.numResults || config.maxResults, config.timeout)
  };
}
function searchCrossRef(http, query, numResults, timeout3) {
  return exports_Effect.gen(function* () {
    const params = new URLSearchParams({
      query,
      rows: String(Math.min(numResults, 50))
    });
    const response = yield* http.execute(exports_HttpClientRequest.get(`${API_URL11}?${params.toString()}`).pipe(exports_HttpClientRequest.setHeaders({
      "User-Agent": USER_AGENT43,
      Accept: "application/json"
    }))).pipe(exports_Effect.timeout(timeout3));
    if (response.status < 200 || response.status >= 400)
      return [];
    const raw2 = yield* response.text;
    if (!raw2)
      return [];
    return parseCrossRefResults(raw2, numResults);
  });
}
function parseCrossRefResults(raw2, maxResults) {
  let parsed;
  try {
    parsed = JSON.parse(raw2);
  } catch {
    return [];
  }
  const data = parsed;
  const items = data?.message?.items;
  if (!Array.isArray(items))
    return [];
  const results = [];
  let pos = 0;
  for (const item of items) {
    if (results.length >= maxResults)
      break;
    if (item.type === "component")
      continue;
    const title = item.title?.[0] || item["container-title"]?.[0] || "";
    const doi = item.DOI || "";
    const journal = item["container-title"]?.[0] || "";
    if (!title)
      continue;
    const authors = item.author?.slice(0, 3).map((a) => `${a.given || ""} ${a.family || ""}`).join(", ") || "";
    const parts2 = [];
    if (authors)
      parts2.push(authors);
    if (journal)
      parts2.push(journal);
    if (item.type)
      parts2.push(item.type);
    if (doi)
      parts2.push(`DOI: ${doi}`);
    const url = item.URL || (doi ? `https://doi.org/${doi}` : "");
    if (!url)
      continue;
    let publishedDate;
    if (item.published?.["date-parts"]?.[0]) {
      const dateParts = item.published["date-parts"][0];
      try {
        const year = dateParts[0];
        const month = dateParts[1] || 1;
        const day = dateParts[2] || 1;
        publishedDate = new Date(year, month - 1, day).getTime();
      } catch {}
    }
    pos++;
    results.push(makeSearchResult({
      title,
      url,
      snippet: parts2.join(" · "),
      engine: "crossref",
      position: pos,
      publishedDate,
      category: "academic"
    }));
  }
  return results;
}

// src/search/engines/openverse.ts
var API_URL12 = "https://api.openverse.org/v1/images/";
var USER_AGENT44 = "opencode-search/1.0";
function makeOpenverse(config) {
  return {
    name: config.name,
    config,
    search: (http, query, opts) => searchOpenverse(http, query, opts.numResults || config.maxResults, config.timeout)
  };
}
function searchOpenverse(http, query, numResults, timeout3) {
  return exports_Effect.gen(function* () {
    const params = new URLSearchParams({
      q: query,
      page_size: String(Math.min(numResults, 50))
    });
    const response = yield* http.execute(exports_HttpClientRequest.get(`${API_URL12}?${params.toString()}`).pipe(exports_HttpClientRequest.setHeaders({
      "User-Agent": USER_AGENT44,
      Accept: "application/json"
    }))).pipe(exports_Effect.timeout(timeout3));
    if (response.status < 200 || response.status >= 400)
      return [];
    const raw2 = yield* response.text;
    if (!raw2)
      return [];
    return parseOpenverseResults(raw2, numResults);
  });
}
function parseOpenverseResults(raw2, maxResults) {
  let parsed;
  try {
    parsed = JSON.parse(raw2);
  } catch {
    return [];
  }
  const data = parsed;
  const entries = data?.results;
  if (!Array.isArray(entries))
    return [];
  const results = [];
  let pos = 0;
  for (const entry of entries) {
    if (results.length >= maxResults)
      break;
    if (!entry.foreign_landing_url)
      continue;
    const parts2 = [];
    if (entry.creator)
      parts2.push(`by ${entry.creator}`);
    if (entry.license)
      parts2.push(entry.license);
    if (entry.source)
      parts2.push(entry.source);
    pos++;
    results.push(makeSearchResult({
      title: entry.title || "Openverse image",
      url: entry.foreign_landing_url,
      snippet: parts2.join(" · ") || "Creative Commons image",
      engine: "openverse",
      position: pos,
      publishedDate: entry.created_on ? new Date(entry.created_on).getTime() : undefined,
      category: "image"
    }));
  }
  return results;
}

// src/search/engines/ebay.ts
var BASE_URL7 = "https://www.ebay.com";
var USER_AGENT45 = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
function makeEbay(config) {
  return {
    name: config.name,
    config,
    search: (http, query, opts) => searchEbay(http, query, opts.numResults || config.maxResults, config.timeout)
  };
}
function searchEbay(http, query, numResults, timeout3) {
  return exports_Effect.gen(function* () {
    const params = new URLSearchParams({
      _nkw: query,
      _sacat: "0"
    });
    const response = yield* http.execute(exports_HttpClientRequest.get(`${BASE_URL7}/sch/i.html?${params.toString()}`).pipe(exports_HttpClientRequest.setHeaders({
      "User-Agent": USER_AGENT45,
      Accept: "text/html"
    }))).pipe(exports_Effect.timeout(timeout3));
    if (response.status < 200 || response.status >= 400)
      return [];
    const html = yield* response.text;
    if (!html)
      return [];
    return parseEbayResults(html, numResults);
  });
}
function parseEbayResults(html, maxResults) {
  const results = [];
  let pos = 0;
  const itemRegex = /<li[^>]*class="[^"]*s-item[^"]*"[^>]*>[\s\S]*?<a[^>]*class="[^"]*s-item__link[^"]*"[^>]*href="([^"]*)"[^>]*>[\s\S]*?<span[^>]*class="[^"]*s-item__title[^"]*"[^>]*>([\s\S]*?)<\/span>[\s\S]*?<span[^>]*class="[^"]*s-item__price[^"]*"[^>]*>([\s\S]*?)<\/span>/gi;
  let match6;
  while ((match6 = itemRegex.exec(html)) !== null) {
    if (results.length >= maxResults)
      break;
    const url = match6[1].trim();
    const title = match6[2].replace(/<[^>]+>/g, "").trim();
    const price = match6[3].replace(/<[^>]+>/g, "").trim();
    if (!title || !url || title === "Shop on eBay")
      continue;
    pos++;
    results.push(makeSearchResult({
      title,
      url,
      snippet: price ? `${price} · eBay` : "eBay",
      engine: "ebay",
      position: pos,
      category: "shopping"
    }));
  }
  if (results.length === 0) {
    const fallbackRegex = /href="(https:\/\/www\.ebay\.com\/itm\/[^"]*)"[^>]*>[\s\S]*?<span[^>]*>([^<]+)<\/span>/gi;
    while ((match6 = fallbackRegex.exec(html)) !== null) {
      if (results.length >= maxResults)
        break;
      const url = match6[1];
      const title = match6[2].trim();
      if (!title)
        continue;
      pos++;
      results.push(makeSearchResult({
        title,
        url,
        snippet: "eBay item",
        engine: "ebay",
        position: pos,
        category: "shopping"
      }));
    }
  }
  return results;
}

// src/search/engines/pinterest.ts
var BASE_URL8 = "https://www.pinterest.com";
var USER_AGENT46 = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
function makePinterest(config) {
  return {
    name: config.name,
    config,
    search: (http, query, opts) => searchPinterest(http, query, opts.numResults || config.maxResults, config.timeout)
  };
}
function searchPinterest(http, query, numResults, timeout3) {
  return exports_Effect.gen(function* () {
    const args2 = {
      options: {
        query,
        bookmarks: [""]
      },
      context: {}
    };
    const response = yield* http.execute(exports_HttpClientRequest.get(`${BASE_URL8}/resource/BaseSearchResource/get/?data=${encodeURIComponent(JSON.stringify(args2))}`).pipe(exports_HttpClientRequest.setHeaders({
      "User-Agent": USER_AGENT46,
      Accept: "application/json",
      "X-Pinterest-AppState": "active",
      "X-Pinterest-Source-Url": "/ideas/",
      "X-Pinterest-PWS-Handler": "www/ideas.js"
    }))).pipe(exports_Effect.timeout(timeout3));
    if (response.status < 200 || response.status >= 400)
      return [];
    const raw2 = yield* response.text;
    if (!raw2)
      return [];
    return parsePinterestResults(raw2, numResults);
  });
}
function parsePinterestResults(raw2, maxResults) {
  let parsed;
  try {
    parsed = JSON.parse(raw2);
  } catch {
    return [];
  }
  const data = parsed;
  const pins = data?.resource_response?.data?.results;
  if (!Array.isArray(pins))
    return [];
  const results = [];
  let pos = 0;
  for (const pin of pins) {
    if (results.length >= maxResults)
      break;
    if (pin.type === "story")
      continue;
    const url = pin.link || `${BASE_URL8}/pin/${pin.id}/`;
    const title = pin.title || pin.grid_title || "";
    const description = pin.rich_summary?.display_description || "";
    const author = pin.pinner?.full_name || "";
    const parts2 = [];
    if (author)
      parts2.push(`by ${author}`);
    if (pin.rich_summary?.site_name)
      parts2.push(pin.rich_summary.site_name);
    pos++;
    results.push(makeSearchResult({
      title: title || `Pinterest pin ${pin.id}`,
      url,
      snippet: parts2.join(" · ") || description || "Pinterest",
      engine: "pinterest",
      position: pos,
      category: "image"
    }));
  }
  return results;
}

// src/search/engines/qwant.ts
var API_URL13 = "https://api.qwant.com/v3/search/web";
var USER_AGENT47 = "opencode-search/1.0";
function makeQwant(config) {
  return {
    name: config.name,
    config,
    search: (http, query, opts) => searchQwant(http, query, opts.numResults || config.maxResults, config.timeout)
  };
}
function searchQwant(http, query, numResults, timeout3) {
  return exports_Effect.gen(function* () {
    const params = new URLSearchParams({
      q: query,
      count: String(Math.min(numResults, 20)),
      locale: "en_US",
      offset: "0",
      device: "desktop",
      safesearch: "0",
      tgp: "1",
      display: "true",
      llm: "true"
    });
    const response = yield* http.execute(exports_HttpClientRequest.get(`${API_URL13}?${params.toString()}`).pipe(exports_HttpClientRequest.setHeaders({
      "User-Agent": USER_AGENT47,
      Accept: "application/json"
    }))).pipe(exports_Effect.timeout(timeout3));
    if (response.status < 200 || response.status >= 400)
      return [];
    const raw2 = yield* response.text;
    if (!raw2)
      return [];
    return parseQwantResults(raw2, numResults);
  });
}
function parseQwantResults(raw2, maxResults) {
  let parsed;
  try {
    parsed = JSON.parse(raw2);
  } catch {
    return [];
  }
  const data = parsed;
  const mainline = data?.data?.result?.items?.mainline;
  if (!Array.isArray(mainline))
    return [];
  const results = [];
  let pos = 0;
  for (const section of mainline) {
    if (section.type !== "web")
      continue;
    const items = section.items;
    if (!Array.isArray(items))
      continue;
    for (const item of items) {
      if (results.length >= maxResults)
        break;
      if (!item.title || !item.url)
        continue;
      const publishedDate = item.date ? new Date(item.date * 1000).getTime() : undefined;
      pos++;
      results.push(makeSearchResult({
        title: item.title,
        url: item.url,
        snippet: item.desc || "",
        engine: "qwant",
        position: pos,
        publishedDate,
        category: "general"
      }));
    }
  }
  return results;
}

// src/search/engines/yahoo.ts
var BASE_URL9 = "https://search.yahoo.com";
var USER_AGENT48 = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
function makeYahoo(config) {
  return {
    name: config.name,
    config,
    search: (http, query, opts) => searchYahoo(http, query, opts.numResults || config.maxResults, config.timeout)
  };
}
function searchYahoo(http, query, numResults, timeout3) {
  return exports_Effect.gen(function* () {
    const params = new URLSearchParams({ p: query });
    const response = yield* http.execute(exports_HttpClientRequest.get(`${BASE_URL9}/search?${params.toString()}`).pipe(exports_HttpClientRequest.setHeaders({
      "User-Agent": USER_AGENT48,
      Accept: "text/html"
    }))).pipe(exports_Effect.timeout(timeout3));
    if (response.status < 200 || response.status >= 400)
      return [];
    const html = yield* response.text;
    if (!html)
      return [];
    return parseYahooResults(html, numResults);
  });
}
function parseYahooResults(html, maxResults) {
  const results = [];
  let pos = 0;
  const resultRegex = /<div[^>]*class="[^"]*algo-sr[^"]*"[^>]*>[\s\S]*?<h3[^>]*>[\s\S]*?<a[^>]*href="([^"]*)"[^>]*>[\s\S]*?<span[^>]*>([\s\S]*?)<\/span>[\s\S]*?<\/h3>[\s\S]*?<div[^>]*class="[^"]*compText[^"]*"[^>]*>([\s\S]*?)<\/div>/gi;
  let match6;
  while ((match6 = resultRegex.exec(html)) !== null) {
    if (results.length >= maxResults)
      break;
    let url = match6[1].trim();
    const title = match6[2].replace(/<[^>]+>/g, "").trim();
    const content = match6[3].replace(/<[^>]+>/g, "").trim();
    if (!title || !url)
      continue;
    const ruMatch = url.match(/\/RU=([^/]+)\/RK/);
    if (ruMatch) {
      try {
        url = decodeURIComponent(ruMatch[1]);
      } catch {}
    }
    pos++;
    results.push(makeSearchResult({
      title,
      url,
      snippet: content,
      engine: "yahoo",
      position: pos,
      category: "general"
    }));
  }
  if (results.length === 0) {
    const fallbackRegex = /<a[^>]*class="[^"]*d-ib[^"]*"[^>]*href="([^"]*)"[^>]*>[\s\S]*?<span[^>]*class="[^"]*fc-falcon[^"]*"[^>]*>([\s\S]*?)<\/span>/gi;
    while ((match6 = fallbackRegex.exec(html)) !== null) {
      if (results.length >= maxResults)
        break;
      let url = match6[1].trim();
      const title = match6[2].replace(/<[^>]+>/g, "").trim();
      if (!title)
        continue;
      const ruMatch = url.match(/\/RU=([^/]+)\/RK/);
      if (ruMatch) {
        try {
          url = decodeURIComponent(ruMatch[1]);
        } catch {}
      }
      pos++;
      results.push(makeSearchResult({
        title,
        url,
        snippet: "Yahoo search result",
        engine: "yahoo",
        position: pos,
        category: "general"
      }));
    }
  }
  return results;
}

// src/search/engines/rottentomatoes.ts
var BASE_URL10 = "https://www.rottentomatoes.com";
var USER_AGENT49 = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
function makeRottenTomatoes(config) {
  return {
    name: config.name,
    config,
    search: (http, query, opts) => searchRottenTomatoes(http, query, opts.numResults || config.maxResults, config.timeout)
  };
}
function searchRottenTomatoes(http, query, numResults, timeout3) {
  return exports_Effect.gen(function* () {
    const params = new URLSearchParams({ search: query });
    const response = yield* http.execute(exports_HttpClientRequest.get(`${BASE_URL10}/search?${params.toString()}`).pipe(exports_HttpClientRequest.setHeaders({
      "User-Agent": USER_AGENT49,
      Accept: "text/html"
    }))).pipe(exports_Effect.timeout(timeout3));
    if (response.status < 200 || response.status >= 400)
      return [];
    const html = yield* response.text;
    if (!html)
      return [];
    return parseRottenTomatoesResults(html, numResults);
  });
}
function parseRottenTomatoesResults(html, maxResults) {
  const results = [];
  let pos = 0;
  const rowRegex = /<search-page-media-row[^>]*>[\s\S]*?<a[^>]*href="([^"]*)"[^>]*>[\s\S]*?<img[^>]*alt="([^"]*)"[^>]*src="([^"]*)"[^>]*>[\s\S]*?<\/search-page-media-row>/gi;
  let match6;
  while ((match6 = rowRegex.exec(html)) !== null) {
    if (results.length >= maxResults)
      break;
    const href = match6[1].trim();
    const title = match6[2].trim();
    const thumbnail = match6[3].trim();
    if (!title || !href)
      continue;
    const url = href.startsWith("http") ? href : `${BASE_URL10}${href}`;
    pos++;
    results.push(makeSearchResult({
      title,
      url,
      snippet: "Rotten Tomatoes",
      engine: "rottentomatoes",
      position: pos,
      category: "video"
    }));
  }
  if (results.length === 0) {
    const fallbackRegex = /href="(https:\/\/www\.rottentomatoes\.com\/m\/[^"]*)"[^>]*>[\s\S]*?<img[^>]*alt="([^"]*)"/gi;
    while ((match6 = fallbackRegex.exec(html)) !== null) {
      if (results.length >= maxResults)
        break;
      const url = match6[1];
      const title = match6[2].trim();
      if (!title)
        continue;
      pos++;
      results.push(makeSearchResult({
        title,
        url,
        snippet: "Movie on Rotten Tomatoes",
        engine: "rottentomatoes",
        position: pos,
        category: "video"
      }));
    }
  }
  return results;
}

// src/search/engines/steam.ts
var API_URL14 = "https://store.steampowered.com/api/storesearch/";
var USER_AGENT50 = "opencode-search/1.0";
function makeSteam(config) {
  return {
    name: config.name,
    config,
    search: (http, query, opts) => searchSteam(http, query, opts.numResults || config.maxResults, config.timeout)
  };
}
function searchSteam(http, query, numResults, timeout3) {
  return exports_Effect.gen(function* () {
    const params = new URLSearchParams({
      term: query,
      cc: "us",
      l: "en"
    });
    const response = yield* http.execute(exports_HttpClientRequest.get(`${API_URL14}?${params.toString()}`).pipe(exports_HttpClientRequest.setHeaders({
      "User-Agent": USER_AGENT50,
      Accept: "application/json"
    }))).pipe(exports_Effect.timeout(timeout3));
    if (response.status < 200 || response.status >= 400)
      return [];
    const raw2 = yield* response.text;
    if (!raw2)
      return [];
    return parseSteamResults(raw2, numResults);
  });
}
function parseSteamResults(raw2, maxResults) {
  let parsed;
  try {
    parsed = JSON.parse(raw2);
  } catch {
    return [];
  }
  const data = parsed;
  const items = data?.items;
  if (!Array.isArray(items))
    return [];
  const results = [];
  let pos = 0;
  for (const item of items) {
    if (results.length >= maxResults)
      break;
    if (!item.id || !item.name)
      continue;
    const price = item.price?.final ? (item.price.final / 100).toFixed(2) : "";
    const currency = item.price?.currency || "USD";
    const platforms = item.platforms ? Object.entries(item.platforms).filter(([, v]) => v).map(([k]) => k).join(", ") : "";
    const parts2 = [];
    if (price)
      parts2.push(`$${price} ${currency}`);
    if (platforms)
      parts2.push(platforms);
    pos++;
    results.push(makeSearchResult({
      title: item.name,
      url: `https://store.steampowered.com/app/${item.id}`,
      snippet: parts2.join(" · ") || "Steam game",
      engine: "steam",
      position: pos,
      category: "video"
    }));
  }
  return results;
}

// src/search/engines/pexels.ts
var BASE_URL11 = "https://www.pexels.com";
var USER_AGENT51 = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
function makePexels(config) {
  return {
    name: config.name,
    config,
    search: (http, query, opts) => searchPexels(http, query, opts.numResults || config.maxResults, config.timeout)
  };
}
function searchPexels(http, query, numResults, timeout3) {
  return exports_Effect.gen(function* () {
    const response = yield* http.execute(exports_HttpClientRequest.get(`${BASE_URL11}/en-us/search/${encodeURIComponent(query)}/`).pipe(exports_HttpClientRequest.setHeaders({
      "User-Agent": USER_AGENT51,
      Accept: "text/html"
    }))).pipe(exports_Effect.timeout(timeout3));
    if (response.status < 200 || response.status >= 400)
      return [];
    const html = yield* response.text;
    if (!html)
      return [];
    return parsePexelsResults(html, numResults);
  });
}
function parsePexelsResults(html, maxResults) {
  const results = [];
  let pos = 0;
  const photoRegex = /href="\/en-us\/photo\/([^"]*)"[\s\S]*?<img[^>]*alt="([^"]*)"[^>]*src="([^"]*)"/gi;
  let match6;
  while ((match6 = photoRegex.exec(html)) !== null) {
    if (results.length >= maxResults)
      break;
    const slug = match6[1].trim();
    const title = match6[2].trim();
    const thumbnail = match6[3].trim();
    if (!slug)
      continue;
    const url = `${BASE_URL11}/en-us/photo/${slug}`;
    pos++;
    results.push(makeSearchResult({
      title: title || "Pexels photo",
      url,
      snippet: "Free stock photo · Pexels",
      engine: "pexels",
      position: pos,
      category: "image"
    }));
  }
  if (results.length === 0) {
    const fallbackRegex = /href="(https:\/\/www\.pexels\.com\/photo\/[^"]*)"[^>]*>[\s\S]*?<img[^>]*alt="([^"]*)"/gi;
    while ((match6 = fallbackRegex.exec(html)) !== null) {
      if (results.length >= maxResults)
        break;
      const url = match6[1];
      const title = match6[2].trim();
      if (!title)
        continue;
      pos++;
      results.push(makeSearchResult({
        title,
        url,
        snippet: "Stock photo · Pexels",
        engine: "pexels",
        position: pos,
        category: "image"
      }));
    }
  }
  return results;
}

// src/search/engines/openalex.ts
var API_URL15 = "https://api.openalex.org/works";
var USER_AGENT52 = "opencode-search/1.0 (mailto:search@opencode.ai)";
function makeOpenAlex(config) {
  return {
    name: config.name,
    config,
    search: (http, query, opts) => searchOpenAlex(http, query, opts.numResults || config.maxResults, config.timeout)
  };
}
function searchOpenAlex(http, query, numResults, timeout3) {
  return exports_Effect.gen(function* () {
    const params = new URLSearchParams({
      search: query,
      per_page: String(Math.min(numResults, 50)),
      sort: "relevance_score:desc"
    });
    const response = yield* http.execute(exports_HttpClientRequest.get(`${API_URL15}?${params.toString()}`).pipe(exports_HttpClientRequest.setHeaders({
      "User-Agent": USER_AGENT52,
      Accept: "application/json"
    }))).pipe(exports_Effect.timeout(timeout3));
    if (response.status < 200 || response.status >= 400)
      return [];
    const raw2 = yield* response.text;
    if (!raw2)
      return [];
    return parseOpenAlexResults(raw2, numResults);
  });
}
function parseOpenAlexResults(raw2, maxResults) {
  let parsed;
  try {
    parsed = JSON.parse(raw2);
  } catch {
    return [];
  }
  const data = parsed;
  const works = data?.results;
  if (!Array.isArray(works))
    return [];
  const results = [];
  let pos = 0;
  for (const work of works) {
    if (results.length >= maxResults)
      break;
    if (!work.title)
      continue;
    const url = work.primary_location?.landing_page_url || work.open_access?.oa_url || work.id || "";
    if (!url)
      continue;
    const authors = work.authorships?.slice(0, 3).map((a) => a.author?.display_name || "").filter(Boolean) || [];
    const doi = work.doi?.replace("https://doi.org/", "") || "";
    const concepts = work.concepts?.slice(0, 3).map((c) => c.display_name || "").filter(Boolean) || [];
    const parts2 = [];
    if (authors.length)
      parts2.push(authors.join(", "));
    if (doi)
      parts2.push(`DOI: ${doi}`);
    if (work.cited_by_count)
      parts2.push(`${work.cited_by_count} citations`);
    pos++;
    results.push(makeSearchResult({
      title: work.title,
      url,
      snippet: parts2.join(" · ") || "OpenAlex academic paper",
      engine: "openalex",
      position: pos,
      publishedDate: work.publication_date ? new Date(work.publication_date).getTime() : undefined,
      category: "academic"
    }));
  }
  return results;
}

// src/search/engines/niconico.ts
var BASE_URL12 = "https://www.nicovideo.jp";
var EMBED_URL = "https://embed.nicovideo.jp";
var USER_AGENT53 = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
function makeNiconico(config) {
  return {
    name: config.name,
    config,
    search: (http, query, opts) => searchNiconico(http, query, opts.numResults || config.maxResults, config.timeout)
  };
}
function searchNiconico(http, query, numResults, timeout3) {
  return exports_Effect.gen(function* () {
    const response = yield* http.execute(exports_HttpClientRequest.get(`${BASE_URL12}/search/${encodeURIComponent(query)}`).pipe(exports_HttpClientRequest.setHeaders({
      "User-Agent": USER_AGENT53,
      Accept: "text/html"
    }))).pipe(exports_Effect.timeout(timeout3));
    if (response.status < 200 || response.status >= 400)
      return [];
    const html = yield* response.text;
    if (!html)
      return [];
    return parseNiconicoResults(html, numResults);
  });
}
function parseNiconicoResults(html, maxResults) {
  const results = [];
  let pos = 0;
  const itemRegex = /<li[^>]*data-video-item[^>]*>[\s\S]*?<a[^>]*class="[^"]*itemThumbWrap[^"]*"[^>]*href="([^"]*)"[^>]*>[\s\S]*?<span[^>]*class="[^"]*videoLength[^"]*"[^>]*>([\d:]+)<\/span>[\s\S]*?<p[^>]*class="[^"]*itemTitle[^"]*"[^>]*>[\s\S]*?<a[^>]*>([\s\S]*?)<\/a>[\s\S]*?<img[^>]*class="[^"]*thumb[^"]*"[^>]*src="([^"]*)"/gi;
  let match6;
  while ((match6 = itemRegex.exec(html)) !== null) {
    if (results.length >= maxResults)
      break;
    const relativeUrl = match6[1].trim();
    const videoLength = match6[2].trim();
    const title = match6[3].replace(/<[^>]+>/g, "").trim();
    const thumbnail = match6[4].trim();
    if (!title || !relativeUrl)
      continue;
    const videoIdMatch = relativeUrl.match(/\/watch\/([a-z0-9]+)/i);
    const videoId = videoIdMatch?.[1] || relativeUrl.split("/").pop() || "";
    const url = `${BASE_URL12}/watch/${videoId}`;
    const embedSrc = `${EMBED_URL}/watch/${videoId}`;
    pos++;
    results.push(makeSearchResult({
      title: `${title}${videoLength ? ` (${videoLength})` : ""}`,
      url,
      snippet: `Niconico · ${videoLength}`,
      engine: "niconico",
      position: pos,
      category: "video"
    }));
  }
  if (results.length === 0) {
    const fallbackRegex = /href="\/watch\/([a-z0-9]+)"[^>]*>[\s\S]*?<img[^>]*alt="([^"]*)"/gi;
    while ((match6 = fallbackRegex.exec(html)) !== null) {
      if (results.length >= maxResults)
        break;
      const videoId = match6[1];
      const title = match6[2].trim();
      if (!title)
        continue;
      pos++;
      results.push(makeSearchResult({
        title,
        url: `${BASE_URL12}/watch/${videoId}`,
        snippet: "Niconico video",
        engine: "niconico",
        position: pos,
        category: "video"
      }));
    }
  }
  return results;
}

// src/search/engines/deviantart.ts
var BASE_URL13 = "https://www.deviantart.com";
var USER_AGENT54 = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
function makeDeviantArt(config) {
  return {
    name: config.name,
    config,
    search: (http, query, opts) => searchDeviantArt(http, query, opts.numResults || config.maxResults, config.timeout)
  };
}
function searchDeviantArt(http, query, numResults, timeout3) {
  return exports_Effect.gen(function* () {
    const params = new URLSearchParams({ q: query });
    const response = yield* http.execute(exports_HttpClientRequest.get(`${BASE_URL13}/search?${params.toString()}`).pipe(exports_HttpClientRequest.setHeaders({
      "User-Agent": USER_AGENT54,
      Accept: "text/html"
    }))).pipe(exports_Effect.timeout(timeout3));
    if (response.status < 200 || response.status >= 400)
      return [];
    const html = yield* response.text;
    if (!html)
      return [];
    return parseDeviantArtResults(html, numResults);
  });
}
function parseDeviantArtResults(html, maxResults) {
  const results = [];
  let pos = 0;
  const artRegex = /href="(https:\/\/www\.deviantart\.com\/[^/]+\/art\/[^"]*)"[^>]*>[\s\S]*?<img[^>]*alt="([^"]*)"[^>]*src="([^"]*)"/gi;
  let match6;
  while ((match6 = artRegex.exec(html)) !== null) {
    if (results.length >= maxResults)
      break;
    const url = match6[1].trim();
    const title = match6[2].trim();
    const thumbnail = match6[3].trim();
    if (!title || !url)
      continue;
    pos++;
    results.push(makeSearchResult({
      title,
      url,
      snippet: "DeviantArt artwork",
      engine: "deviantart",
      position: pos,
      category: "image"
    }));
  }
  if (results.length === 0) {
    const fallbackRegex = /href="(\/[^/]+\/art\/[^"]*)"[^>]*>[\s\S]*?<span[^>]*>([^<]+)<\/span>/gi;
    while ((match6 = fallbackRegex.exec(html)) !== null) {
      if (results.length >= maxResults)
        break;
      const href = match6[1];
      const title = match6[2].trim();
      if (!title)
        continue;
      const url = href.startsWith("http") ? href : `${BASE_URL13}${href}`;
      pos++;
      results.push(makeSearchResult({
        title,
        url,
        snippet: "Artwork on DeviantArt",
        engine: "deviantart",
        position: pos,
        category: "image"
      }));
    }
  }
  return results;
}

// src/search/engines/google-videos.ts
var USER_AGENT55 = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
function makeGoogleVideos(config) {
  return {
    name: config.name,
    config,
    search: (http, query, opts) => searchGoogleVideos(http, query, opts.numResults || config.maxResults, config.timeout)
  };
}
function searchGoogleVideos(http, query, numResults, timeout3) {
  return exports_Effect.gen(function* () {
    const params = new URLSearchParams({
      q: query,
      tbm: "vid"
    });
    const response = yield* http.execute(exports_HttpClientRequest.get(`https://www.google.com/search?${params.toString()}`).pipe(exports_HttpClientRequest.setHeaders({
      "User-Agent": USER_AGENT55,
      Accept: "text/html",
      "Accept-Language": "en-US,en;q=0.9",
      Cookie: "CONSENT=YES+"
    }))).pipe(exports_Effect.timeout(timeout3));
    if (response.status < 200 || response.status >= 400)
      return [];
    const html = yield* response.text;
    if (!html)
      return [];
    if (html.includes("/sorry/") || html.length < 2000)
      return [];
    return parseGoogleVideosResults(html, numResults);
  });
}
function parseGoogleVideosResults(html, maxResults) {
  const results = [];
  let pos = 0;
  const videoRegex = /<div[^>]*class="[^"]*MjjYud[^"]*"[^>]*>[\s\S]*?<a[^>]*href="([^"]*)"[^>]*>[\s\S]*?<h3[^>]*>([\s\S]*?)<\/h3>[\s\S]*?<\/a>[\s\S]*?<div[^>]*class="[^"]*ITZIwc[^"]*"[^>]*>([\s\S]*?)<\/div>/gi;
  let match6;
  while ((match6 = videoRegex.exec(html)) !== null) {
    if (results.length >= maxResults)
      break;
    let url = match6[1].trim();
    const title = match6[2].replace(/<[^>]+>/g, "").trim();
    const content = match6[3].replace(/<[^>]+>/g, "").trim();
    if (!title || !url)
      continue;
    if (url.startsWith("/url?q=")) {
      const urlMatch = url.match(/\/url\?q=([^&]+)/);
      if (urlMatch)
        url = decodeURIComponent(urlMatch[1]);
    }
    pos++;
    results.push(makeSearchResult({
      title,
      url,
      snippet: content,
      engine: "google-videos",
      position: pos,
      category: "video"
    }));
  }
  return results;
}

// src/search/engines/bandcamp.ts
var BASE_URL14 = "https://bandcamp.com";
var USER_AGENT56 = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
function makeBandcamp(config) {
  return {
    name: config.name,
    config,
    search: (http, query, opts) => searchBandcamp(http, query, opts.numResults || config.maxResults, config.timeout)
  };
}
function searchBandcamp(http, query, numResults, timeout3) {
  return exports_Effect.gen(function* () {
    const params = new URLSearchParams({ q: query });
    const response = yield* http.execute(exports_HttpClientRequest.get(`${BASE_URL14}/search?${params.toString()}`).pipe(exports_HttpClientRequest.setHeaders({
      "User-Agent": USER_AGENT56,
      Accept: "text/html"
    }))).pipe(exports_Effect.timeout(timeout3));
    if (response.status < 200 || response.status >= 400)
      return [];
    const html = yield* response.text;
    if (!html)
      return [];
    return parseBandcampResults(html, numResults);
  });
}
function parseBandcampResults(html, maxResults) {
  const results = [];
  let pos = 0;
  const itemRegex = /<li[^>]*class="[^"]*searchresult[^"]*"[^>]*>[\s\S]*?<div[^>]*class="[^"]*heading[^"]*"[^>]*>[\s\S]*?<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<div[^>]*class="[^"]*subhead[^"]*"[^>]*>([\s\S]*?)<\/div>/gi;
  let match6;
  while ((match6 = itemRegex.exec(html)) !== null) {
    if (results.length >= maxResults)
      break;
    const href = match6[1].trim();
    const title = match6[2].replace(/<[^>]+>/g, "").trim();
    const content = match6[3].replace(/<[^>]+>/g, "").trim();
    if (!title || !href)
      continue;
    const url = href.startsWith("http") ? href : `${BASE_URL14}${href}`;
    pos++;
    results.push(makeSearchResult({
      title,
      url,
      snippet: content || "Bandcamp music",
      engine: "bandcamp",
      position: pos,
      category: "music"
    }));
  }
  return results;
}

// src/search/engines/genius.ts
var API_URL16 = "https://genius.com/api/search";
var USER_AGENT57 = "opencode-search/1.0";
function makeGenius(config) {
  return {
    name: config.name,
    config,
    search: (http, query, opts) => searchGenius(http, query, opts.numResults || config.maxResults, config.timeout)
  };
}
function searchGenius(http, query, numResults, timeout3) {
  return exports_Effect.gen(function* () {
    const params = new URLSearchParams({
      q: query,
      per_page: String(Math.min(numResults, 20))
    });
    const response = yield* http.execute(exports_HttpClientRequest.get(`${API_URL16}/multi?${params.toString()}`).pipe(exports_HttpClientRequest.setHeaders({
      "User-Agent": USER_AGENT57,
      Accept: "application/json"
    }))).pipe(exports_Effect.timeout(timeout3));
    if (response.status < 200 || response.status >= 400)
      return [];
    const raw2 = yield* response.text;
    if (!raw2)
      return [];
    return parseGeniusResults(raw2, numResults);
  });
}
function parseGeniusResults(raw2, maxResults) {
  let parsed;
  try {
    parsed = JSON.parse(raw2);
  } catch {
    return [];
  }
  const data = parsed;
  const sections = data?.response?.sections;
  if (!Array.isArray(sections))
    return [];
  const results = [];
  let pos = 0;
  for (const section of sections) {
    const hits = section.hits;
    if (!Array.isArray(hits))
      continue;
    for (const hit of hits) {
      if (results.length >= maxResults)
        break;
      const result3 = hit.result;
      if (!result3?.url)
        continue;
      let title = "";
      let content = "";
      let thumbnail = "";
      if (hit.type === "lyric" || hit.type === "song") {
        title = result3.full_title || "";
        content = hit.highlights?.[0]?.value || result3.title_with_featured || "";
        thumbnail = result3.song_art_image_thumbnail_url || "";
      } else if (hit.type === "artist") {
        title = result3.name || "";
        content = "Artist";
        thumbnail = result3.image_url || "";
      } else if (hit.type === "album") {
        title = result3.full_title || "";
        content = result3.name_with_artist || "";
        thumbnail = result3.cover_art_url || "";
      }
      if (!title)
        continue;
      pos++;
      results.push(makeSearchResult({
        title,
        url: result3.url,
        snippet: content || `Genius ${hit.type || "result"}`,
        engine: "genius",
        position: pos,
        publishedDate: result3.lyrics_updated_at ? new Date(result3.lyrics_updated_at * 1000).getTime() : undefined,
        category: "music"
      }));
    }
  }
  return results;
}

// src/search/engines/imgur.ts
var BASE_URL15 = "https://imgur.com";
var USER_AGENT58 = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
function makeImgur(config) {
  return {
    name: config.name,
    config,
    search: (http, query, opts) => searchImgur(http, query, opts.numResults || config.maxResults, config.timeout)
  };
}
function searchImgur(http, query, numResults, timeout3) {
  return exports_Effect.gen(function* () {
    const params = new URLSearchParams({
      q: query,
      qs: "thumbs",
      p: "0"
    });
    const response = yield* http.execute(exports_HttpClientRequest.get(`${BASE_URL15}/search/score/all?${params.toString()}`).pipe(exports_HttpClientRequest.setHeaders({
      "User-Agent": USER_AGENT58,
      Accept: "text/html"
    }))).pipe(exports_Effect.timeout(timeout3));
    if (response.status < 200 || response.status >= 400)
      return [];
    const html = yield* response.text;
    if (!html)
      return [];
    return parseImgurResults(html, numResults);
  });
}
function parseImgurResults(html, maxResults) {
  const results = [];
  let pos = 0;
  const postRegex = /<div[^>]*class="[^"]*post[^"]*"[^>]*>[\s\S]*?<a[^>]*href="([^"]*)"[^>]*>[\s\S]*?<img[^>]*alt="([^"]*)"[^>]*src="([^"]*)"[^>]*>[\s\S]*?<\/a>/gi;
  let match6;
  while ((match6 = postRegex.exec(html)) !== null) {
    if (results.length >= maxResults)
      break;
    const href = match6[1].trim();
    const title = match6[2].trim();
    const thumbnail = match6[3].trim();
    if (!href || thumbnail.length < 25)
      continue;
    const url = href.startsWith("http") ? href : `${BASE_URL15}${href}`;
    const imgSrc = thumbnail.replace(/\.(.+)$/, ".png");
    pos++;
    results.push(makeSearchResult({
      title: title || "Imgur image",
      url,
      snippet: "Imgur image",
      engine: "imgur",
      position: pos,
      category: "image"
    }));
  }
  return results;
}

// src/search/engines/rumble.ts
var BASE_URL16 = "https://rumble.com";
var USER_AGENT59 = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
function makeRumble(config) {
  return {
    name: config.name,
    config,
    search: (http, query, opts) => searchRumble(http, query, opts.numResults || config.maxResults, config.timeout)
  };
}
function searchRumble(http, query, numResults, timeout3) {
  return exports_Effect.gen(function* () {
    const params = new URLSearchParams({ q: query });
    const response = yield* http.execute(exports_HttpClientRequest.get(`${BASE_URL16}/search/video?${params.toString()}`).pipe(exports_HttpClientRequest.setHeaders({
      "User-Agent": USER_AGENT59,
      Accept: "text/html"
    }))).pipe(exports_Effect.timeout(timeout3));
    if (response.status < 200 || response.status >= 400)
      return [];
    const html = yield* response.text;
    if (!html)
      return [];
    return parseRumbleResults(html, numResults);
  });
}
function parseRumbleResults(html, maxResults) {
  const results = [];
  let pos = 0;
  const itemRegex = /<li[^>]*class="[^"]*video-listing-entry[^"]*"[^>]*>[\s\S]*?<a[^>]*class="[^"]*video-item--a[^"]*"[^>]*href="([^"]*)"[^>]*>[\s\S]*?<img[^>]*class="[^"]*video-item--img[^"]*"[^>]*src="([^"]*)"[^>]*>[\s\S]*?<\/a>[\s\S]*?<h3[^>]*class="[^"]*video-item--title[^"]*"[^>]*>([\s\S]*?)<\/h3>[\s\S]*?<span[^>]*class="[^"]*video-item--views[^"]*"[^>]*data-value="([^"]*)"/gi;
  let match6;
  while ((match6 = itemRegex.exec(html)) !== null) {
    if (results.length >= maxResults)
      break;
    const href = match6[1].trim();
    const thumbnail = match6[2].trim();
    const title = match6[3].replace(/<[^>]+>/g, "").trim();
    const views = match6[4].trim();
    if (!title || !href)
      continue;
    const url = href.startsWith("http") ? href : `${BASE_URL16}${href}`;
    pos++;
    results.push(makeSearchResult({
      title,
      url,
      snippet: views ? `${views} views · Rumble` : "Rumble video",
      engine: "rumble",
      position: pos,
      category: "video"
    }));
  }
  return results;
}

// src/search/engines/pkg-go-dev.ts
var BASE_URL17 = "https://pkg.go.dev";
var USER_AGENT60 = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
function makePkgGoDev(config) {
  return {
    name: config.name,
    config,
    search: (http, query, opts) => searchPkgGoDev(http, query, opts.numResults || config.maxResults, config.timeout)
  };
}
function searchPkgGoDev(http, query, numResults, timeout3) {
  return exports_Effect.gen(function* () {
    const params = new URLSearchParams({
      q: query,
      m: "package"
    });
    const response = yield* http.execute(exports_HttpClientRequest.get(`${BASE_URL17}/search?${params.toString()}`).pipe(exports_HttpClientRequest.setHeaders({
      "User-Agent": USER_AGENT60,
      Accept: "text/html"
    }))).pipe(exports_Effect.timeout(timeout3));
    if (response.status < 200 || response.status >= 400)
      return [];
    const html = yield* response.text;
    if (!html)
      return [];
    return parsePkgGoDevResults(html, numResults);
  });
}
function parsePkgGoDevResults(html, maxResults) {
  const results = [];
  let pos = 0;
  const snippetRegex = /<div[^>]*class="[^"]*SearchSnippet[^"]*"[^>]*>[\s\S]*?<h2[^>]*>[\s\S]*?<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<\/h2>[\s\S]*?<p[^>]*class="[^"]*SearchSnippet-synopsis[^"]*"[^>]*>([\s\S]*?)<\/p>/gi;
  let match6;
  while ((match6 = snippetRegex.exec(html)) !== null) {
    if (results.length >= maxResults)
      break;
    const href = match6[1].trim();
    const titleRaw = match6[2].replace(/<[^>]+>/g, "").trim();
    const synopsis = match6[3].replace(/<[^>]+>/g, "").trim();
    if (!titleRaw || !href)
      continue;
    const url = href.startsWith("http") ? href : `${BASE_URL17}${href}`;
    pos++;
    results.push(makeSearchResult({
      title: titleRaw,
      url,
      snippet: synopsis || "Go package",
      engine: "pkg-go-dev",
      position: pos,
      category: "code"
    }));
  }
  return results;
}

// src/search/engines/peertube.ts
var API_URL17 = "https://peer.tube/api/v1/search/videos";
var USER_AGENT61 = "opencode-search/1.0";
function makePeerTube(config) {
  return {
    name: config.name,
    config,
    search: (http, query, opts) => searchPeerTube(http, query, opts.numResults || config.maxResults, config.timeout)
  };
}
function searchPeerTube(http, query, numResults, timeout3) {
  return exports_Effect.gen(function* () {
    const params = new URLSearchParams({
      search: query,
      searchTarget: "search-index",
      resultType: "videos",
      count: String(Math.min(numResults, 50)),
      sort: "-match",
      nsfw: "both"
    });
    const response = yield* http.execute(exports_HttpClientRequest.get(`${API_URL17}?${params.toString()}`).pipe(exports_HttpClientRequest.setHeaders({
      "User-Agent": USER_AGENT61,
      Accept: "application/json"
    }))).pipe(exports_Effect.timeout(timeout3));
    if (response.status < 200 || response.status >= 400)
      return [];
    const raw2 = yield* response.text;
    if (!raw2)
      return [];
    return parsePeerTubeResults(raw2, numResults);
  });
}
function parsePeerTubeResults(raw2, maxResults) {
  let parsed;
  try {
    parsed = JSON.parse(raw2);
  } catch {
    return [];
  }
  const data = parsed;
  const videos = data?.data;
  if (!Array.isArray(videos))
    return [];
  const results = [];
  let pos = 0;
  for (const video of videos) {
    if (results.length >= maxResults)
      break;
    if (!video.url || !video.name)
      continue;
    const channel = video.channel?.displayName || video.channel?.name || "";
    const host = video.channel?.host || "";
    const tags = video.tags?.slice(0, 3).join(", ") || "";
    const parts2 = [];
    if (channel)
      parts2.push(channel);
    if (host)
      parts2.push(`@${host}`);
    if (video.duration) {
      const min4 = Math.floor(video.duration / 60);
      const sec = video.duration % 60;
      parts2.push(`${min4}:${sec.toString().padStart(2, "0")}`);
    }
    if (video.views)
      parts2.push(`${video.views.toLocaleString()} views`);
    pos++;
    results.push(makeSearchResult({
      title: video.name,
      url: video.url,
      snippet: parts2.join(" · ") || "PeerTube video",
      engine: "peertube",
      position: pos,
      publishedDate: video.publishedAt ? new Date(video.publishedAt).getTime() : undefined,
      category: "video"
    }));
  }
  return results;
}

// src/search/engines/pixiv.ts
var BASE_URL18 = "https://www.pixiv.net";
var USER_AGENT62 = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
function makePixiv(config) {
  return {
    name: config.name,
    config,
    search: (http, query, opts) => searchPixiv(http, query, opts.numResults || config.maxResults, config.timeout)
  };
}
function searchPixiv(http, query, numResults, timeout3) {
  return exports_Effect.gen(function* () {
    const params = new URLSearchParams({
      word: query,
      order: "date_d",
      mode: "all",
      p: "1",
      s_mode: "s_tag_full",
      type: "illust_and_ugoira",
      lang: "en"
    });
    const response = yield* http.execute(exports_HttpClientRequest.get(`${BASE_URL18}/ajax/search/illustrations/${encodeURIComponent(query)}?${params.toString()}`).pipe(exports_HttpClientRequest.setHeaders({
      "User-Agent": USER_AGENT62,
      Accept: "application/json",
      Referer: `${BASE_URL18}/`
    }))).pipe(exports_Effect.timeout(timeout3));
    if (response.status < 200 || response.status >= 400)
      return [];
    const raw2 = yield* response.text;
    if (!raw2)
      return [];
    return parsePixivResults(raw2, numResults);
  });
}
function parsePixivResults(raw2, maxResults) {
  let parsed;
  try {
    parsed = JSON.parse(raw2);
  } catch {
    return [];
  }
  const data = parsed;
  const illusts = data?.body?.illust?.data;
  if (!Array.isArray(illusts))
    return [];
  const results = [];
  let pos = 0;
  for (const illust of illusts) {
    if (results.length >= maxResults)
      break;
    if (!illust.title)
      continue;
    const url = `https://www.pixiv.net/artworks/${illust.illustId || ""}`;
    const author = illust.userName || "";
    pos++;
    results.push(makeSearchResult({
      title: illust.title,
      url,
      snippet: author ? `by ${author} · Pixiv` : "Pixiv illustration",
      engine: "pixiv",
      position: pos,
      category: "image"
    }));
  }
  return results;
}

// src/search/engines/deezer.ts
var API_URL18 = "https://api.deezer.com/search";
var USER_AGENT63 = "opencode-search/1.0";
function makeDeezer(config) {
  return {
    name: config.name,
    config,
    search: (http, query, opts) => searchDeezer(http, query, opts.numResults || config.maxResults, config.timeout)
  };
}
function searchDeezer(http, query, numResults, timeout3) {
  return exports_Effect.gen(function* () {
    const params = new URLSearchParams({
      q: query,
      limit: String(Math.min(numResults, 25))
    });
    const response = yield* http.execute(exports_HttpClientRequest.get(`${API_URL18}?${params.toString()}`).pipe(exports_HttpClientRequest.setHeaders({
      "User-Agent": USER_AGENT63,
      Accept: "application/json"
    }))).pipe(exports_Effect.timeout(timeout3));
    if (response.status < 200 || response.status >= 400)
      return [];
    const raw2 = yield* response.text;
    if (!raw2)
      return [];
    return parseDeezerResults(raw2, numResults);
  });
}
function parseDeezerResults(raw2, maxResults) {
  let parsed;
  try {
    parsed = JSON.parse(raw2);
  } catch {
    return [];
  }
  const data = parsed;
  const tracks = data?.data;
  if (!Array.isArray(tracks))
    return [];
  const results = [];
  let pos = 0;
  for (const track2 of tracks) {
    if (results.length >= maxResults)
      break;
    if (track2.type !== "track" || !track2.title)
      continue;
    const url = track2.link?.replace("http://", "https://") || "";
    if (!url)
      continue;
    const artist = track2.artist?.name || "";
    const album = track2.album?.title || "";
    const content = `${artist} - ${album} - ${track2.title}`;
    pos++;
    results.push(makeSearchResult({
      title: track2.title,
      url,
      snippet: content,
      engine: "deezer",
      position: pos,
      category: "music"
    }));
  }
  return results;
}

// src/search/engines/reuters.ts
var BASE_URL19 = "https://www.reuters.com";
var USER_AGENT64 = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
function makeReuters(config) {
  return {
    name: config.name,
    config,
    search: (http, query, opts) => searchReuters(http, query, opts.numResults || config.maxResults, config.timeout)
  };
}
function searchReuters(http, query, numResults, timeout3) {
  return exports_Effect.gen(function* () {
    const args2 = {
      keyword: query,
      offset: 0,
      orderby: "relevance",
      size: Math.min(numResults, 20),
      website: "reuters"
    };
    const params = new URLSearchParams({
      query: JSON.stringify(args2)
    });
    const response = yield* http.execute(exports_HttpClientRequest.get(`${BASE_URL19}/pf/api/v3/content/fetch/articles-by-search-v2?${params.toString()}`).pipe(exports_HttpClientRequest.setHeaders({
      "User-Agent": USER_AGENT64,
      Accept: "application/json"
    }))).pipe(exports_Effect.timeout(timeout3));
    if (response.status < 200 || response.status >= 400)
      return [];
    const raw2 = yield* response.text;
    if (!raw2)
      return [];
    return parseReutersResults(raw2, numResults);
  });
}
function parseReutersResults(raw2, maxResults) {
  let parsed;
  try {
    parsed = JSON.parse(raw2);
  } catch {
    return [];
  }
  const data = parsed;
  const articles = data?.result?.articles;
  if (!Array.isArray(articles))
    return [];
  const results = [];
  let pos = 0;
  for (const article of articles) {
    if (results.length >= maxResults)
      break;
    if (!article.canonical_url || !article.web)
      continue;
    const url = `${BASE_URL19}${article.canonical_url}`;
    const metadata = article.kicker?.name || "";
    pos++;
    results.push(makeSearchResult({
      title: article.web,
      url,
      snippet: article.description || metadata || "Reuters news",
      engine: "reuters",
      position: pos,
      publishedDate: article.display_time ? new Date(article.display_time).getTime() : undefined,
      category: "news"
    }));
  }
  return results;
}

// src/search/engines/wttr.ts
var API_URL19 = "https://wttr.in";
var USER_AGENT65 = "opencode-search/1.0";
function makeWttr(config) {
  return {
    name: config.name,
    config,
    search: (http, query, opts) => searchWttr(http, query, opts.numResults || config.maxResults, config.timeout)
  };
}
function searchWttr(http, query, numResults, timeout3) {
  return exports_Effect.gen(function* () {
    const params = new URLSearchParams({
      format: "j1",
      lang: "en"
    });
    const response = yield* http.execute(exports_HttpClientRequest.get(`${API_URL19}/${encodeURIComponent(query)}?${params.toString()}`).pipe(exports_HttpClientRequest.setHeaders({
      "User-Agent": USER_AGENT65,
      Accept: "application/json"
    }))).pipe(exports_Effect.timeout(timeout3));
    if (response.status < 200 || response.status >= 400)
      return [];
    const raw2 = yield* response.text;
    if (!raw2)
      return [];
    return parseWttrResults(raw2, query, numResults);
  });
}
var WEATHER_CODES = {
  "113": "Clear sky",
  "116": "Partly cloudy",
  "119": "Cloudy",
  "122": "Overcast",
  "143": "Mist",
  "176": "Light rain showers",
  "179": "Light snow showers",
  "200": "Thunderstorm",
  "227": "Light snow",
  "230": "Heavy snow",
  "248": "Fog",
  "263": "Light drizzle",
  "266": "Moderate drizzle",
  "293": "Light rain",
  "296": "Moderate rain",
  "299": "Heavy rain",
  "302": "Heavy rain",
  "305": "Very heavy rain",
  "308": "Torrential rain",
  "323": "Light snow",
  "326": "Moderate snow",
  "329": "Heavy snow",
  "332": "Heavy snow",
  "335": "Very heavy snow",
  "338": "Blizzard",
  "353": "Light rain shower",
  "356": "Heavy rain shower",
  "359": "Violent rain shower",
  "386": "Thunderstorm with light rain",
  "389": "Thunderstorm with heavy rain"
};
function parseWttrResults(raw2, query, maxResults) {
  let parsed;
  try {
    parsed = JSON.parse(raw2);
  } catch {
    return [];
  }
  const data = parsed;
  const current = data.current_condition?.[0];
  if (!current)
    return [];
  const results = [];
  let pos = 0;
  const tempC = current.temp_C || "";
  const feelsLike = current.FeelsLikeC || "";
  const condition = WEATHER_CODES[current.weatherCode || ""] || current.weatherDesc?.[0]?.value || "Unknown";
  const humidity = current.humidity || "";
  const windSpeed = current.windspeedKmph || "";
  const pressure = current.pressure || "";
  const snippet = `${tempC}°C (feels like ${feelsLike}°C) · ${condition} · Humidity: ${humidity}% · Wind: ${windSpeed} km/h`;
  pos++;
  results.push(makeSearchResult({
    title: `Weather in ${query}: ${tempC}°C - ${condition}`,
    url: `https://wttr.in/${encodeURIComponent(query)}`,
    snippet,
    engine: "wttr",
    position: pos,
    category: "weather"
  }));
  const weather = data.weather;
  if (Array.isArray(weather)) {
    for (const day of weather.slice(0, Math.min(maxResults - 1, 3))) {
      if (results.length >= maxResults)
        break;
      if (!day.date)
        continue;
      const dayCondition = day.hourly?.[4] || day.hourly?.[0];
      if (!dayCondition)
        continue;
      const dayTemp = dayCondition.temp_C || "";
      const dayWeather = WEATHER_CODES[dayCondition.weatherCode || ""] || dayCondition.weatherDesc?.[0]?.value || "";
      pos++;
      results.push(makeSearchResult({
        title: `${day.date}: ${dayTemp}°C - ${dayWeather}`,
        url: `https://wttr.in/${encodeURIComponent(query)}`,
        snippet: `Forecast for ${day.date}`,
        engine: "wttr",
        position: pos,
        category: "weather"
      }));
    }
  }
  return results;
}

// src/search/engines/yahoo-news.ts
var BASE_URL20 = "https://news.search.yahoo.com";
var USER_AGENT66 = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
function makeYahooNews(config) {
  return {
    name: config.name,
    config,
    search: (http, query, opts) => searchYahooNews(http, query, opts.numResults || config.maxResults, config.timeout)
  };
}
function searchYahooNews(http, query, numResults, timeout3) {
  return exports_Effect.gen(function* () {
    const params = new URLSearchParams({ p: query });
    const response = yield* http.execute(exports_HttpClientRequest.get(`${BASE_URL20}/search?${params.toString()}`).pipe(exports_HttpClientRequest.setHeaders({
      "User-Agent": USER_AGENT66,
      Accept: "text/html"
    }))).pipe(exports_Effect.timeout(timeout3));
    if (response.status < 200 || response.status >= 400)
      return [];
    const html = yield* response.text;
    if (!html)
      return [];
    return parseYahooNewsResults(html, numResults);
  });
}
function parseYahooNewsResults(html, maxResults) {
  const results = [];
  let pos = 0;
  const itemRegex = /<li[^>]*>[\s\S]*?<h4[^>]*>[\s\S]*?<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<\/h4>[\s\S]*?<p[^>]*>([\s\S]*?)<\/p>/gi;
  let match6;
  while ((match6 = itemRegex.exec(html)) !== null) {
    if (results.length >= maxResults)
      break;
    const url = match6[1].trim();
    const title = match6[2].replace(/<[^>]+>/g, "").trim();
    const content = match6[3].replace(/<[^>]+>/g, "").trim();
    if (!title || !url)
      continue;
    pos++;
    results.push(makeSearchResult({
      title,
      url,
      snippet: content,
      engine: "yahoo-news",
      position: pos,
      category: "news"
    }));
  }
  return results;
}

// src/search/engines/mixcloud.ts
var API_URL20 = "https://api.mixcloud.com/search/";
var USER_AGENT67 = "opencode-search/1.0";
function makeMixcloud(config) {
  return {
    name: config.name,
    config,
    search: (http, query, opts) => searchMixcloud(http, query, opts.numResults || config.maxResults, config.timeout)
  };
}
function searchMixcloud(http, query, numResults, timeout3) {
  return exports_Effect.gen(function* () {
    const params = new URLSearchParams({
      q: query,
      type: "cloudcast",
      limit: String(Math.min(numResults, 10))
    });
    const response = yield* http.execute(exports_HttpClientRequest.get(`${API_URL20}?${params.toString()}`).pipe(exports_HttpClientRequest.setHeaders({
      "User-Agent": USER_AGENT67,
      Accept: "application/json"
    }))).pipe(exports_Effect.timeout(timeout3));
    if (response.status < 200 || response.status >= 400)
      return [];
    const raw2 = yield* response.text;
    if (!raw2)
      return [];
    return parseMixcloudResults(raw2, numResults);
  });
}
function parseMixcloudResults(raw2, maxResults) {
  let parsed;
  try {
    parsed = JSON.parse(raw2);
  } catch {
    return [];
  }
  const data = parsed;
  const items = data?.data;
  if (!Array.isArray(items))
    return [];
  const results = [];
  let pos = 0;
  for (const item of items) {
    if (results.length >= maxResults)
      break;
    if (!item.url || !item.name)
      continue;
    const author = item.user?.name || "";
    pos++;
    results.push(makeSearchResult({
      title: item.name,
      url: item.url,
      snippet: author ? `by ${author} · Mixcloud` : "Mixcloud",
      engine: "mixcloud",
      position: pos,
      publishedDate: item.created_time ? new Date(item.created_time).getTime() : undefined,
      category: "music"
    }));
  }
  return results;
}

// src/search/engines/lib-rs.ts
var BASE_URL21 = "https://lib.rs";
var USER_AGENT68 = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
function makeLibRs(config) {
  return {
    name: config.name,
    config,
    search: (http, query, opts) => searchLibRs(http, query, opts.numResults || config.maxResults, config.timeout)
  };
}
function searchLibRs(http, query, numResults, timeout3) {
  return exports_Effect.gen(function* () {
    const params = new URLSearchParams({ q: query });
    const response = yield* http.execute(exports_HttpClientRequest.get(`${BASE_URL21}/search?${params.toString()}`).pipe(exports_HttpClientRequest.setHeaders({
      "User-Agent": USER_AGENT68,
      Accept: "text/html"
    }))).pipe(exports_Effect.timeout(timeout3));
    if (response.status < 200 || response.status >= 400)
      return [];
    const html = yield* response.text;
    if (!html)
      return [];
    return parseLibRsResults(html, numResults);
  });
}
function parseLibRsResults(html, maxResults) {
  const results = [];
  let pos = 0;
  const itemRegex = /<a[^>]*href="([^"]*)"[^>]*>[\s\S]*?<h4[^>]*>([\s\S]*?)<\/h4>[\s\S]*?<p[^>]*>([\s\S]*?)<\/p>/gi;
  let match6;
  while ((match6 = itemRegex.exec(html)) !== null) {
    if (results.length >= maxResults)
      break;
    const href = match6[1].trim();
    const title = match6[2].replace(/<[^>]+>/g, "").trim();
    const content = match6[3].replace(/<[^>]+>/g, "").trim();
    if (!title || !href)
      continue;
    const url = href.startsWith("http") ? href : `${BASE_URL21}${href}`;
    pos++;
    results.push(makeSearchResult({
      title,
      url,
      snippet: content || "Rust library",
      engine: "lib-rs",
      position: pos,
      category: "code"
    }));
  }
  return results;
}

// src/search/engines/fdroid.ts
var BASE_URL22 = "https://search.f-droid.org";
var USER_AGENT69 = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
function makeFDroid(config) {
  return {
    name: config.name,
    config,
    search: (http, query, opts) => searchFDroid(http, query, opts.numResults || config.maxResults, config.timeout)
  };
}
function searchFDroid(http, query, numResults, timeout3) {
  return exports_Effect.gen(function* () {
    const params = new URLSearchParams({
      q: query,
      lang: ""
    });
    const response = yield* http.execute(exports_HttpClientRequest.get(`${BASE_URL22}/?${params.toString()}`).pipe(exports_HttpClientRequest.setHeaders({
      "User-Agent": USER_AGENT69,
      Accept: "text/html"
    }))).pipe(exports_Effect.timeout(timeout3));
    if (response.status < 200 || response.status >= 400)
      return [];
    const html = yield* response.text;
    if (!html)
      return [];
    return parseFDroidResults(html, numResults);
  });
}
function parseFDroidResults(html, maxResults) {
  const results = [];
  let pos = 0;
  const itemRegex = /<a[^>]*class="[^"]*package-header[^"]*"[^>]*href="([^"]*)"[^>]*>[\s\S]*?<h4[^>]*class="[^"]*package-name[^"]*"[^>]*>([\s\S]*?)<\/h4>[\s\S]*?<span[^>]*class="[^"]*package-summary[^"]*"[^>]*>([\s\S]*?)<\/span>/gi;
  let match6;
  while ((match6 = itemRegex.exec(html)) !== null) {
    if (results.length >= maxResults)
      break;
    const href = match6[1].trim();
    const title = match6[2].replace(/<[^>]+>/g, "").trim();
    const summary = match6[3].replace(/<[^>]+>/g, "").trim();
    if (!title || !href)
      continue;
    const url = href.startsWith("http") ? href : href;
    pos++;
    results.push(makeSearchResult({
      title,
      url,
      snippet: summary || "F-Droid open source app",
      engine: "fdroid",
      position: pos,
      category: "apps"
    }));
  }
  return results;
}

// src/search/engines/mastodon.ts
var API_URL21 = "https://mastodon.social/api/v2/search";
var USER_AGENT70 = "opencode-search/1.0";
function makeMastodon(config) {
  return {
    name: config.name,
    config,
    search: (http, query, opts) => searchMastodon(http, query, opts.numResults || config.maxResults, config.timeout)
  };
}
function searchMastodon(http, query, numResults, timeout3) {
  return exports_Effect.gen(function* () {
    const params = new URLSearchParams({
      q: query,
      resolve: "false",
      type: "accounts",
      limit: String(Math.min(numResults, 40))
    });
    const response = yield* http.execute(exports_HttpClientRequest.get(`${API_URL21}?${params.toString()}`).pipe(exports_HttpClientRequest.setHeaders({
      "User-Agent": USER_AGENT70,
      Accept: "application/json"
    }))).pipe(exports_Effect.timeout(timeout3));
    if (response.status < 200 || response.status >= 400)
      return [];
    const raw2 = yield* response.text;
    if (!raw2)
      return [];
    return parseMastodonResults(raw2, numResults);
  });
}
function parseMastodonResults(raw2, maxResults) {
  let parsed;
  try {
    parsed = JSON.parse(raw2);
  } catch {
    return [];
  }
  const data = parsed;
  const accounts = data?.accounts;
  if (!Array.isArray(accounts))
    return [];
  const results = [];
  let pos = 0;
  for (const account of accounts) {
    if (results.length >= maxResults)
      break;
    if (!account.uri || !account.username)
      continue;
    const displayName = account.display_name || account.username;
    const followers = account.followers_count || 0;
    pos++;
    results.push(makeSearchResult({
      title: `${displayName} (${followers} followers)`,
      url: account.uri,
      snippet: account.note?.replace(/<[^>]+>/g, "").trim() || "Mastodon account",
      engine: "mastodon",
      position: pos,
      publishedDate: account.created_at ? new Date(account.created_at).getTime() : undefined,
      category: "social"
    }));
  }
  return results;
}

// src/search/engines/currency-convert.ts
var BASE_URL23 = "https://duckduckgo.com/js/spice/currency";
var USER_AGENT71 = "opencode-search/1.0";
function makeCurrencyConvert(config) {
  return {
    name: config.name,
    config,
    search: (http, query, opts) => searchCurrencyConvert(http, query, opts.numResults || config.maxResults, config.timeout)
  };
}
function searchCurrencyConvert(http, query, _numResults, timeout3) {
  return exports_Effect.gen(function* () {
    const currencyMatch = query.match(/^(?:(\d+\.?\d*)\s*)?([A-Za-z]{3})\s+(?:to|in|=>|→)\s+([A-Za-z]{3})$|^(\d+\.?\d*)\s+([A-Za-z]{3})\s+([A-Za-z]{3})$|^([A-Za-z]{3})\s+([A-Za-z]{3})$/);
    if (!currencyMatch)
      return [];
    const amount = parseFloat(currencyMatch[1] || currencyMatch[4] || "1");
    const from = (currencyMatch[2] || currencyMatch[5] || currencyMatch[7]).toUpperCase();
    const to = (currencyMatch[3] || currencyMatch[6] || currencyMatch[8]).toUpperCase();
    const response = yield* http.execute(exports_HttpClientRequest.get(`${BASE_URL23}/1/${from}/${to}`).pipe(exports_HttpClientRequest.setHeaders({
      "User-Agent": USER_AGENT71,
      Accept: "application/json"
    }))).pipe(exports_Effect.timeout(timeout3));
    if (response.status < 200 || response.status >= 400)
      return [];
    const raw2 = yield* response.text;
    if (!raw2)
      return [];
    return parseCurrencyResults(raw2, `${amount} ${from}`, from, to, amount);
  });
}
function parseCurrencyResults(raw2, query, from, to, amount = 1) {
  const firstBrace = raw2.indexOf("{");
  const lastBrace = raw2.lastIndexOf("}");
  if (firstBrace === -1 || lastBrace <= firstBrace)
    return [];
  let parsed;
  try {
    parsed = JSON.parse(raw2.slice(firstBrace, lastBrace + 1));
  } catch {
    return [];
  }
  const data = parsed;
  const rate = data.to?.[0]?.mid;
  if (!rate)
    return [];
  const result3 = amount * rate;
  const answer = `${query} = ${result3.toFixed(2)} ${to} (1 ${from} : ${rate.toFixed(4)} ${to})`;
  return [
    makeSearchResult({
      title: `${from} to ${to} Exchange Rate`,
      url: `https://duckduckgo.com/?q=${encodeURIComponent(`${from}+to+${to}`)}`,
      snippet: answer,
      engine: "currency-convert",
      position: 1,
      category: "general"
    })
  ];
}

// src/search/engines/artstation.ts
var BASE_URL24 = "https://www.artstation.com";
var USER_AGENT72 = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
function makeArtStation(config) {
  return {
    name: config.name,
    config,
    search: (http, query, opts) => searchArtStation(http, query, opts.numResults || config.maxResults, config.timeout)
  };
}
function searchArtStation(http, query, numResults, timeout3) {
  return exports_Effect.gen(function* () {
    const params = new URLSearchParams({ query });
    const response = yield* http.execute(exports_HttpClientRequest.get(`${BASE_URL24}/search?${params.toString()}`).pipe(exports_HttpClientRequest.setHeaders({
      "User-Agent": USER_AGENT72,
      Accept: "text/html"
    }))).pipe(exports_Effect.timeout(timeout3));
    if (response.status < 200 || response.status >= 400)
      return [];
    const html = yield* response.text;
    if (!html)
      return [];
    return parseArtStationResults(html, numResults);
  });
}
function parseArtStationResults(html, maxResults) {
  const results = [];
  let pos = 0;
  const scriptRegex = /<script[^>]*>.*?window\.__NEXT_DATA__\s*=\s*({[\s\S]*?})\s*;?\s*<\/script>/gi;
  let match6;
  while ((match6 = scriptRegex.exec(html)) !== null) {
    try {
      const data = JSON.parse(match6[1]);
      const artworks = data?.props?.pageProps?.searchResults?.data || [];
      for (const artwork of artworks) {
        if (results.length >= maxResults)
          break;
        const title = artwork.title || "";
        const url = artwork.permalink ? `${BASE_URL24}${artwork.permalink}` : "";
        const description = artwork.description || "";
        const user = artwork.user?.full_name || artwork.user?.username || "";
        if (!title || !url)
          continue;
        pos++;
        results.push(makeSearchResult({
          title,
          url,
          snippet: user ? `by ${user} · ${description.slice(0, 100)}` : description.slice(0, 100),
          engine: "artstation",
          position: pos,
          category: "images"
        }));
      }
    } catch {}
  }
  if (results.length === 0) {
    const itemRegex = /<a[^>]*href="(\/artwork-?[a-z0-9-]+)"[^>]*>[\s\S]*?<img[^>]*alt="([^"]*)"[^>]*>/gi;
    while ((match6 = itemRegex.exec(html)) !== null) {
      if (results.length >= maxResults)
        break;
      const path = match6[1];
      const title = match6[2];
      const url = `${BASE_URL24}${path}`;
      if (!title || !url)
        continue;
      pos++;
      results.push(makeSearchResult({
        title,
        url,
        snippet: `ArtStation artwork`,
        engine: "artstation",
        position: pos,
        category: "images"
      }));
    }
  }
  return results;
}

// src/search/engines/wikidata.ts
var API_URL22 = "https://www.wikidata.org/w/api.php";
var USER_AGENT73 = "opencode-search/1.0";
function makeWikidata(config) {
  return {
    name: config.name,
    config,
    search: (http, query, opts) => searchWikidata(http, query, opts.numResults || config.maxResults, config.timeout)
  };
}
function searchWikidata(http, query, numResults, timeout3) {
  return exports_Effect.gen(function* () {
    const params = new URLSearchParams({
      action: "wbsearchentities",
      search: query,
      language: "en",
      limit: String(Math.min(numResults, 50)),
      format: "json"
    });
    const response = yield* http.execute(exports_HttpClientRequest.get(`${API_URL22}?${params.toString()}`).pipe(exports_HttpClientRequest.setHeaders({
      "User-Agent": USER_AGENT73,
      Accept: "application/json"
    }))).pipe(exports_Effect.timeout(timeout3));
    if (response.status < 200 || response.status >= 400)
      return [];
    const raw2 = yield* response.text;
    if (!raw2)
      return [];
    return parseWikidataResults(raw2, numResults);
  });
}
function parseWikidataResults(raw2, maxResults) {
  let parsed;
  try {
    parsed = JSON.parse(raw2);
  } catch {
    return [];
  }
  const data = parsed;
  const entries = data?.search;
  if (!Array.isArray(entries))
    return [];
  const results = [];
  let pos = 0;
  for (const entry of entries) {
    if (results.length >= maxResults)
      break;
    if (!entry.id || !entry.label)
      continue;
    const url = entry.url || `https://www.wikidata.org/wiki/${entry.id}`;
    pos++;
    results.push(makeSearchResult({
      title: `${entry.label} (${entry.id})`,
      url,
      snippet: entry.description || "Wikidata entry",
      engine: "wikidata",
      position: pos,
      category: "academic"
    }));
  }
  return results;
}

// src/search/engines/wikicommons.ts
var API_URL23 = "https://commons.wikimedia.org/w/api.php";
var USER_AGENT74 = "opencode-search/1.0";
function makeWikimediaCommons(config) {
  return {
    name: config.name,
    config,
    search: (http, query, opts) => searchWikimediaCommons(http, query, opts.numResults || config.maxResults, config.timeout)
  };
}
function searchWikimediaCommons(http, query, numResults, timeout3) {
  return exports_Effect.gen(function* () {
    const params = new URLSearchParams({
      action: "query",
      list: "search",
      srsearch: query,
      srlimit: String(Math.min(numResults, 50)),
      format: "json"
    });
    const response = yield* http.execute(exports_HttpClientRequest.get(`${API_URL23}?${params.toString()}`).pipe(exports_HttpClientRequest.setHeaders({
      "User-Agent": USER_AGENT74,
      Accept: "application/json"
    }))).pipe(exports_Effect.timeout(timeout3));
    if (response.status < 200 || response.status >= 400)
      return [];
    const raw2 = yield* response.text;
    if (!raw2)
      return [];
    return parseWikimediaCommonsResults(raw2, numResults);
  });
}
function parseWikimediaCommonsResults(raw2, maxResults) {
  let parsed;
  try {
    parsed = JSON.parse(raw2);
  } catch {
    return [];
  }
  const data = parsed;
  const entries = data?.query?.search;
  if (!Array.isArray(entries))
    return [];
  const results = [];
  let pos = 0;
  for (const entry of entries) {
    if (results.length >= maxResults)
      break;
    if (!entry.title)
      continue;
    const url = `https://commons.wikimedia.org/wiki/${encodeURIComponent(entry.title)}`;
    const snippet = entry.snippet?.replace(/<[^>]+>/g, "").trim() || "";
    pos++;
    results.push(makeSearchResult({
      title: entry.title,
      url,
      snippet: snippet || "Wikimedia Commons media",
      engine: "wikicommons",
      position: pos,
      publishedDate: entry.timestamp ? new Date(entry.timestamp).getTime() : undefined,
      category: "image"
    }));
  }
  return results;
}

// src/search/engines/metacpan.ts
var API_URL24 = "https://fastapi.metacpan.org/v1/module/_search";
var USER_AGENT75 = "opencode-search/1.0";
function makeMetacpan(config) {
  return {
    name: config.name,
    config,
    search: (http, query, opts) => searchMetacpan(http, query, opts.numResults || config.maxResults, config.timeout)
  };
}
function searchMetacpan(http, query, numResults, timeout3) {
  return exports_Effect.gen(function* () {
    const params = new URLSearchParams({
      q: query,
      size: String(Math.min(numResults, 50)),
      from: "0"
    });
    const response = yield* http.execute(exports_HttpClientRequest.get(`${API_URL24}?${params.toString()}`).pipe(exports_HttpClientRequest.setHeaders({
      "User-Agent": USER_AGENT75,
      Accept: "application/json"
    }))).pipe(exports_Effect.timeout(timeout3));
    if (response.status < 200 || response.status >= 400)
      return [];
    const raw2 = yield* response.text;
    if (!raw2)
      return [];
    return parseMetacpanResults(raw2, numResults);
  });
}
function parseMetacpanResults(raw2, maxResults) {
  let parsed;
  try {
    parsed = JSON.parse(raw2);
  } catch {
    return [];
  }
  const data = parsed;
  const hits = data?.hits?.hits;
  if (!Array.isArray(hits))
    return [];
  const results = [];
  let pos = 0;
  for (const hit of hits) {
    if (results.length >= maxResults)
      break;
    const source = hit._source;
    if (!source?.name)
      continue;
    const name = source.name;
    const version2 = source.version || "";
    const author = source.author || "";
    const description = source.abstract || source.description || "";
    const distribution = source.distribution || name;
    const parts2 = [];
    if (version2)
      parts2.push(`v${version2}`);
    if (author)
      parts2.push(author);
    const snippet = parts2.length > 0 ? `[${parts2.join(" · ")}] ${description}`.trim() : description || "Perl module";
    pos++;
    results.push(makeSearchResult({
      title: `${name}${version2 ? ` v${version2}` : ""}`,
      url: `https://metacpan.org/pod/${distribution}`,
      snippet: snippet.slice(0, 300),
      engine: "metacpan",
      position: pos,
      publishedDate: source.date ? new Date(source.date).getTime() : undefined,
      category: "code"
    }));
  }
  return results;
}

// src/search/engines/archlinux.ts
var BASE_URL25 = "https://wiki.archlinux.org";
var USER_AGENT76 = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
function makeArchLinux(config) {
  return {
    name: config.name,
    config,
    search: (http, query, opts) => searchArchLinux(http, query, opts.numResults || config.maxResults, config.timeout)
  };
}
function searchArchLinux(http, query, numResults, timeout3) {
  return exports_Effect.gen(function* () {
    const params = new URLSearchParams({
      search: query,
      title: "Special:Search",
      limit: "20",
      offset: "0",
      profile: "default"
    });
    const response = yield* http.execute(exports_HttpClientRequest.get(`${BASE_URL25}/index.php?${params.toString()}`).pipe(exports_HttpClientRequest.setHeaders({
      "User-Agent": USER_AGENT76,
      Accept: "text/html"
    }))).pipe(exports_Effect.timeout(timeout3));
    if (response.status < 200 || response.status >= 400)
      return [];
    const html = yield* response.text;
    if (!html)
      return [];
    return parseArchLinuxResults(html, numResults);
  });
}
function parseArchLinuxResults(html, maxResults) {
  const results = [];
  let pos = 0;
  const itemRegex = /<li[^>]*class="[^"]*mw-search-result[^"]*"[^>]*>[\s\S]*?<div[^>]*class="[^"]*mw-search-result-heading[^"]*"[^>]*>[\s\S]*?<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<div[^>]*class="[^"]*searchresult[^"]*"[^>]*>([\s\S]*?)<\/div>/gi;
  let match6;
  while ((match6 = itemRegex.exec(html)) !== null) {
    if (results.length >= maxResults)
      break;
    const href = match6[1].trim();
    const title = match6[2].replace(/<[^>]+>/g, "").trim();
    const content = match6[3].replace(/<[^>]+>/g, "").trim();
    if (!title || !href)
      continue;
    const url = href.startsWith("http") ? href : `${BASE_URL25}${href}`;
    pos++;
    results.push(makeSearchResult({
      title,
      url,
      snippet: content || "Arch Linux Wiki",
      engine: "archlinux",
      position: pos,
      category: "code"
    }));
  }
  return results;
}

// src/search/engines/alpinelinux.ts
var BASE_URL26 = "https://pkgs.alpinelinux.org";
var USER_AGENT77 = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
function makeAlpineLinux(config) {
  return {
    name: config.name,
    config,
    search: (http, query, opts) => searchAlpineLinux(http, query, opts.numResults || config.maxResults, config.timeout)
  };
}
function searchAlpineLinux(http, query, numResults, timeout3) {
  return exports_Effect.gen(function* () {
    const params = new URLSearchParams({
      name: `*${query}*`,
      arch: "x86_64"
    });
    const response = yield* http.execute(exports_HttpClientRequest.get(`${BASE_URL26}/packages?${params.toString()}`).pipe(exports_HttpClientRequest.setHeaders({
      "User-Agent": USER_AGENT77,
      Accept: "text/html"
    }))).pipe(exports_Effect.timeout(timeout3));
    if (response.status < 200 || response.status >= 400)
      return [];
    const html = yield* response.text;
    if (!html)
      return [];
    return parseAlpineLinuxResults(html, numResults);
  });
}
function parseAlpineLinuxResults(html, maxResults) {
  const results = [];
  let pos = 0;
  const rowRegex = /<tr[^>]*>[\s\S]*?<td[^>]*class="[^"]*package[^"]*"[^>]*>[\s\S]*?<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<\/td>[\s\S]*?<td[^>]*class="[^"]*version[^"]*"[^>]*>([\s\S]*?)<\/td>[\s\S]*?<\/tr>/gi;
  let match6;
  while ((match6 = rowRegex.exec(html)) !== null) {
    if (results.length >= maxResults)
      break;
    const href = match6[1].trim();
    const title = match6[2].replace(/<[^>]+>/g, "").trim();
    const version2 = match6[3].replace(/<[^>]+>/g, "").trim();
    if (!title || !href)
      continue;
    const url = href.startsWith("http") ? href : `${BASE_URL26}${href}`;
    pos++;
    results.push(makeSearchResult({
      title: `${title} v${version2}`,
      url,
      snippet: `Alpine Linux package · v${version2}`,
      engine: "alpinelinux",
      position: pos,
      category: "code"
    }));
  }
  return results;
}

// src/search/engines/voidlinux.ts
var API_URL25 = "https://xq-api.voidlinux.org/v1/query/x86_64";
var USER_AGENT78 = "opencode-search/1.0";
function makeVoidLinux(config) {
  return {
    name: config.name,
    config,
    search: (http, query, opts) => searchVoidLinux(http, query, opts.numResults || config.maxResults, config.timeout)
  };
}
function searchVoidLinux(http, query, numResults, timeout3) {
  return exports_Effect.gen(function* () {
    const params = new URLSearchParams({ q: query });
    const response = yield* http.execute(exports_HttpClientRequest.get(`${API_URL25}?${params.toString()}`).pipe(exports_HttpClientRequest.setHeaders({
      "User-Agent": USER_AGENT78,
      Accept: "application/json"
    }))).pipe(exports_Effect.timeout(timeout3));
    if (response.status < 200 || response.status >= 400)
      return [];
    const raw2 = yield* response.text;
    if (!raw2)
      return [];
    return parseVoidLinuxResults(raw2, numResults);
  });
}
function parseVoidLinuxResults(raw2, maxResults) {
  let parsed;
  try {
    parsed = JSON.parse(raw2);
  } catch {
    return [];
  }
  const data = parsed;
  const packages = data?.data;
  if (!Array.isArray(packages))
    return [];
  const results = [];
  let pos = 0;
  const packageMap = new Map;
  for (const pkg of packages) {
    if (!pkg.name)
      continue;
    const githubSlug = pkg.name.replace(/-(32bit|dbg)$/, "");
    const url = `https://github.com/void-linux/void-packages/tree/master/srcpkgs/${githubSlug}`;
    const existing = packageMap.get(url) || [];
    existing.push(pkg);
    packageMap.set(url, existing);
  }
  for (const [url, pkgs] of packageMap) {
    if (results.length >= maxResults)
      break;
    const names = pkgs.map((p) => p.name).join(" | ");
    const version2 = pkgs[0]?.version || "";
    const revision = pkgs[0]?.revision || "";
    const description = pkgs[0]?.short_desc || "";
    pos++;
    results.push(makeSearchResult({
      title: names,
      url,
      snippet: `${description} · v${version2}_${revision}`,
      engine: "voidlinux",
      position: pos,
      category: "code"
    }));
  }
  return results;
}
// src/search/engines/500px.ts
var USER_AGENT79 = "opencode-search/1.0";
function make500px(config) {
  return {
    name: config.name,
    config,
    search: (http, query, opts) => search500px(http, query, opts.numResults || config.maxResults, config.timeout)
  };
}
function search500px(http, query, numResults, timeout3) {
  return exports_Effect.gen(function* () {
    const params = new URLSearchParams({
      q: query,
      image_size: "400",
      rpp: String(Math.min(numResults, 50)),
      page: "1"
    });
    const response = yield* http.execute(exports_HttpClientRequest.get(`https://500px.com/api/resources/search?${params.toString()}`).pipe(exports_HttpClientRequest.setHeaders({
      "User-Agent": USER_AGENT79,
      Accept: "application/json"
    }))).pipe(exports_Effect.timeout(timeout3));
    if (response.status < 200 || response.status >= 400)
      return [];
    const raw2 = yield* response.text;
    if (!raw2)
      return [];
    return parse500pxResults(raw2, numResults);
  });
}
function parse500pxResults(raw2, maxResults) {
  let parsed;
  try {
    parsed = JSON.parse(raw2);
  } catch {
    return [];
  }
  const data = parsed;
  const photos = data?.photos;
  if (!Array.isArray(photos))
    return [];
  const results = [];
  let pos = 0;
  for (const photo of photos) {
    if (results.length >= maxResults)
      break;
    if (!photo.name || !photo.id)
      continue;
    const name = photo.name;
    const author = photo.user?.fullname || photo.user?.username || "";
    const description = photo.description || "";
    const parts2 = [];
    if (author)
      parts2.push(author);
    const snippet = parts2.length > 0 ? `[${parts2.join(" · ")}] ${description}`.trim() : description || "500px photography";
    pos++;
    results.push(makeSearchResult({
      title: name,
      url: `https://500px.com/photo/${photo.id}`,
      snippet: snippet.slice(0, 300),
      engine: "500px",
      position: pos,
      publishedDate: photo.created_at ? new Date(photo.created_at).getTime() : undefined,
      category: "image"
    }));
  }
  return results;
}

// src/search/engines/freesound.ts
var API_URL26 = "https://freesound.org/apiv2/search/text/";
var USER_AGENT80 = "opencode-search/1.0";
function makeFreesound(config) {
  return {
    name: config.name,
    config,
    search: (http, query, opts) => searchFreesound(http, query, opts.numResults || config.maxResults, config.timeout)
  };
}
function searchFreesound(http, query, numResults, timeout3) {
  return exports_Effect.gen(function* () {
    const params = new URLSearchParams({
      query,
      fields: "id,name,description,url,duration,username,created",
      page_size: String(Math.min(numResults, 50)),
      page: "1"
    });
    const response = yield* http.execute(exports_HttpClientRequest.get(`${API_URL26}?${params.toString()}`).pipe(exports_HttpClientRequest.setHeaders({
      "User-Agent": USER_AGENT80,
      Accept: "application/json"
    }))).pipe(exports_Effect.timeout(timeout3));
    if (response.status < 200 || response.status >= 400)
      return [];
    const raw2 = yield* response.text;
    if (!raw2)
      return [];
    return parseFreesoundResults(raw2, numResults);
  });
}
function parseFreesoundResults(raw2, maxResults) {
  let parsed;
  try {
    parsed = JSON.parse(raw2);
  } catch {
    return [];
  }
  const data = parsed;
  const sounds = data?.results;
  if (!Array.isArray(sounds))
    return [];
  const results = [];
  let pos = 0;
  for (const sound of sounds) {
    if (results.length >= maxResults)
      break;
    if (!sound.name || !sound.id)
      continue;
    const name = sound.name;
    const author = sound.username || "";
    const description = (sound.description || "").replace(/<[^>]+>/g, "").trim();
    const duration = sound.duration ? `${Math.floor(sound.duration / 60)}:${String(Math.floor(sound.duration % 60)).padStart(2, "0")}` : "";
    const parts2 = [];
    if (author)
      parts2.push(author);
    if (duration)
      parts2.push(duration);
    const snippet = parts2.length > 0 ? `[${parts2.join(" · ")}] ${description}`.trim() : description || "Freesound audio";
    pos++;
    results.push(makeSearchResult({
      title: name,
      url: sound.url || `https://freesound.org/s/${sound.id}/`,
      snippet: snippet.slice(0, 300),
      engine: "freesound",
      position: pos,
      publishedDate: sound.created ? new Date(sound.created).getTime() : undefined,
      category: "music"
    }));
  }
  return results;
}

// src/search/engines/spotify.ts
var API_URL27 = "https://api.spotify.com/v1/search";
var WEB_URL = "https://open.spotify.com/search";
var USER_AGENT81 = "opencode-search/1.0";
function makeSpotify(config) {
  return {
    name: config.name,
    config,
    search: (http, query, opts) => searchSpotify(http, query, opts.numResults || config.maxResults, config.timeout)
  };
}
function searchSpotify(http, query, numResults, timeout3) {
  return exports_Effect.gen(function* () {
    const token = process.env.SPOTIFY_ACCESS_TOKEN;
    if (token) {
      const params = new URLSearchParams({
        q: query,
        type: "track,album,artist",
        limit: String(Math.min(numResults, 50)),
        market: "US"
      });
      const response2 = yield* http.execute(exports_HttpClientRequest.get(`${API_URL27}?${params.toString()}`).pipe(exports_HttpClientRequest.setHeaders({
        Authorization: `Bearer ${token}`,
        Accept: "application/json"
      }))).pipe(exports_Effect.timeout(timeout3));
      if (response2.status >= 200 && response2.status < 400) {
        const raw2 = yield* response2.text;
        if (raw2)
          return parseSpotifyApiResults(raw2, numResults);
      }
    }
    const response = yield* http.execute(exports_HttpClientRequest.get(`${WEB_URL}/${encodeURIComponent(query)}`).pipe(exports_HttpClientRequest.setHeaders({
      "User-Agent": USER_AGENT81,
      Accept: "text/html"
    }))).pipe(exports_Effect.timeout(timeout3));
    if (response.status < 200 || response.status >= 400)
      return [];
    const html = yield* response.text;
    if (!html)
      return [];
    return parseSpotifyHtmlResults(html, numResults);
  });
}
function parseSpotifyApiResults(raw2, maxResults) {
  let parsed;
  try {
    parsed = JSON.parse(raw2);
  } catch {
    return [];
  }
  const data = parsed;
  const results = [];
  let pos = 0;
  const allItems = [];
  if (data.tracks?.items) {
    for (const item of data.tracks.items)
      allItems.push({ item, type: "track" });
  }
  if (data.albums?.items) {
    for (const item of data.albums.items)
      allItems.push({ item, type: "album" });
  }
  if (data.artists?.items) {
    for (const item of data.artists.items)
      allItems.push({ item, type: "artist" });
  }
  for (const { item, type } of allItems) {
    if (results.length >= maxResults)
      break;
    if (!item.name)
      continue;
    const name = item.name;
    const artist = item.artists?.map((a) => a.name).filter(Boolean).join(", ") || "";
    const album = item.album?.name || "";
    const url = item.external_urls?.spotify || item.href || `https://open.spotify.com/search/${encodeURIComponent(name)}`;
    const parts2 = [];
    if (type === "track" && artist)
      parts2.push(artist);
    if (type === "track" && album)
      parts2.push(album);
    parts2.push(type);
    const snippet = parts2.length > 0 ? `[${parts2.join(" · ")}]` : type;
    pos++;
    results.push(makeSearchResult({
      title: name,
      url,
      snippet: snippet.slice(0, 300),
      engine: "spotify",
      position: pos,
      category: "music"
    }));
  }
  return results;
}
function parseSpotifyHtmlResults(html, maxResults) {
  const results = [];
  let pos = 0;
  const linkRegex = /<a[^>]*href="(https:\/\/open\.spotify\.com\/(track|album|artist)\/[^"]+)"[^>]*>[\s\S]*?<\/a>/gi;
  let match6;
  while ((match6 = linkRegex.exec(html)) !== null) {
    if (results.length >= maxResults)
      break;
    const url = match6[1];
    const type = match6[2];
    const title = match6[0].replace(/<[^>]+>/g, "").trim();
    if (!title || !url)
      continue;
    pos++;
    results.push(makeSearchResult({
      title: title.slice(0, 100),
      url,
      snippet: `Spotify ${type}`,
      engine: "spotify",
      position: pos,
      category: "music"
    }));
  }
  return results;
}

// src/search/engines/open-meteo.ts
var GEO_URL = "https://geocoding-api.open-meteo.com";
var API_URL28 = "https://api.open-meteo.com";
var USER_AGENT82 = "opencode-search/1.0";
function makeOpenMeteo(config) {
  return {
    name: config.name,
    config,
    search: (http, query, opts) => searchOpenMeteo(http, query, opts.numResults || config.maxResults, config.timeout)
  };
}
function searchOpenMeteo(http, query, numResults, timeout3) {
  return exports_Effect.gen(function* () {
    const geoParams = new URLSearchParams({
      name: query,
      count: "1",
      language: "en",
      format: "json"
    });
    const geoResponse = yield* http.execute(exports_HttpClientRequest.get(`${GEO_URL}/v1/search?${geoParams.toString()}`).pipe(exports_HttpClientRequest.setHeaders({
      "User-Agent": USER_AGENT82,
      Accept: "application/json"
    }))).pipe(exports_Effect.timeout(timeout3));
    if (geoResponse.status < 200 || geoResponse.status >= 400)
      return [];
    const geoRaw = yield* geoResponse.text;
    if (!geoRaw)
      return [];
    let geoParsed;
    try {
      geoParsed = JSON.parse(geoRaw);
    } catch {
      return [];
    }
    const geoData = geoParsed;
    const location2 = geoData.results?.[0];
    if (!location2?.latitude || !location2?.longitude)
      return [];
    const weatherParams = new URLSearchParams({
      latitude: String(location2.latitude),
      longitude: String(location2.longitude),
      timeformat: "unixtime",
      timezone: "auto",
      format: "json",
      current: "temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m",
      forecast_days: "3"
    });
    const weatherResponse = yield* http.execute(exports_HttpClientRequest.get(`${API_URL28}/v1/forecast?${weatherParams.toString()}`).pipe(exports_HttpClientRequest.setHeaders({
      "User-Agent": USER_AGENT82,
      Accept: "application/json"
    }))).pipe(exports_Effect.timeout(timeout3));
    if (weatherResponse.status < 200 || weatherResponse.status >= 400)
      return [];
    const weatherRaw = yield* weatherResponse.text;
    if (!weatherRaw)
      return [];
    return parseOpenMeteoResults(weatherRaw, location2.name || query, numResults);
  });
}
var WMO_CODES = {
  0: "Clear sky",
  1: "Mainly clear",
  2: "Partly cloudy",
  3: "Overcast",
  45: "Fog",
  48: "Depositing rime fog",
  51: "Light drizzle",
  53: "Moderate drizzle",
  55: "Dense drizzle",
  61: "Slight rain",
  63: "Moderate rain",
  65: "Heavy rain",
  71: "Slight snow",
  73: "Moderate snow",
  75: "Heavy snow",
  80: "Slight rain showers",
  81: "Moderate rain showers",
  82: "Violent rain showers",
  95: "Thunderstorm",
  96: "Thunderstorm with slight hail",
  99: "Thunderstorm with heavy hail"
};
function parseOpenMeteoResults(raw2, location2, maxResults) {
  let parsed;
  try {
    parsed = JSON.parse(raw2);
  } catch {
    return [];
  }
  const data = parsed;
  const current = data.current;
  if (!current)
    return [];
  const results = [];
  let pos = 0;
  const temp = current.temperature_2m || 0;
  const feelsLike = current.apparent_temperature || 0;
  const humidity = current.relative_humidity_2m || 0;
  const windSpeed = current.wind_speed_10m || 0;
  const weatherCode = current.weather_code || 0;
  const condition = WMO_CODES[weatherCode] || "Unknown";
  const snippet = `${temp}°C (feels like ${feelsLike}°C) · ${condition} · Humidity: ${humidity}% · Wind: ${windSpeed} km/h`;
  pos++;
  results.push(makeSearchResult({
    title: `Weather in ${location2}: ${temp}°C - ${condition}`,
    url: `https://open-meteo.com/en/docs#latitude=${location2}`,
    snippet,
    engine: "open-meteo",
    position: pos,
    category: "weather"
  }));
  return results;
}

// src/search/engines/lemmy.ts
var API_URL29 = "https://lemmy.ml/api/v3/search";
var USER_AGENT83 = "opencode-search/1.0";
function makeLemmy(config) {
  return {
    name: config.name,
    config,
    search: (http, query, opts) => searchLemmy(http, query, opts.numResults || config.maxResults, config.timeout)
  };
}
function searchLemmy(http, query, numResults, timeout3) {
  return exports_Effect.gen(function* () {
    const params = new URLSearchParams({
      q: query,
      type_: "Posts",
      limit: String(Math.min(numResults, 50))
    });
    const response = yield* http.execute(exports_HttpClientRequest.get(`${API_URL29}?${params.toString()}`).pipe(exports_HttpClientRequest.setHeaders({
      "User-Agent": USER_AGENT83,
      Accept: "application/json"
    }))).pipe(exports_Effect.timeout(timeout3));
    if (response.status < 200 || response.status >= 400)
      return [];
    const raw2 = yield* response.text;
    if (!raw2)
      return [];
    return parseLemmyResults(raw2, numResults);
  });
}
function parseLemmyResults(raw2, maxResults) {
  let parsed;
  try {
    parsed = JSON.parse(raw2);
  } catch {
    return [];
  }
  const data = parsed;
  const posts = data?.posts;
  if (!Array.isArray(posts))
    return [];
  const results = [];
  let pos = 0;
  for (const item of posts) {
    if (results.length >= maxResults)
      break;
    if (!item.post?.ap_id || !item.post?.name)
      continue;
    const author = item.creator?.display_name || item.creator?.name || "";
    const community = item.community?.title || "";
    const upvotes = item.counts?.upvotes || 0;
    const downvotes = item.counts?.downvotes || 0;
    const comments = item.counts?.comments || 0;
    const parts2 = [];
    if (author)
      parts2.push(`by ${author}`);
    if (community)
      parts2.push(community);
    parts2.push(`▲${upvotes} ▼${downvotes}`);
    if (comments > 0)
      parts2.push(`${comments} comments`);
    pos++;
    results.push(makeSearchResult({
      title: item.post.name,
      url: item.post.ap_id,
      snippet: parts2.join(" · "),
      engine: "lemmy",
      position: pos,
      publishedDate: item.post.published ? new Date(item.post.published).getTime() : undefined,
      category: "social"
    }));
  }
  return results;
}

// src/search/engines/startpage.ts
var BASE_URL27 = "https://www.startpage.com";
var USER_AGENT84 = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
function makeStartpage(config) {
  return {
    name: config.name,
    config,
    search: (http, query, opts) => searchStartpage(http, query, opts.numResults || config.maxResults, config.timeout)
  };
}
function searchStartpage(http, query, numResults, timeout3) {
  return exports_Effect.gen(function* () {
    const params = new URLSearchParams({
      q: query,
      cat: "web",
      language: "english"
    });
    const response = yield* http.execute(exports_HttpClientRequest.get(`${BASE_URL27}/do/search?${params.toString()}`).pipe(exports_HttpClientRequest.setHeaders({
      "User-Agent": USER_AGENT84,
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9"
    }))).pipe(exports_Effect.timeout(timeout3));
    if (response.status < 200 || response.status >= 400)
      return [];
    const html = yield* response.text;
    if (!html)
      return [];
    return parseStartpageResults(html, numResults);
  });
}
function parseStartpageResults(html, maxResults) {
  const results = [];
  let pos = 0;
  const resultRegex = /<div[^>]*class="[^"]*w-gl__result[^"]*"[^>]*>[\s\S]*?<a[^>]*class="[^"]*w-gl__result-url[^"]*"[^>]*href="([^"]*)"[^>]*>[\s\S]*?<h3[^>]*class="[^"]*w-gl__result-title[^"]*"[^>]*>([\s\S]*?)<\/h3>[\s\S]*?<p[^>]*class="[^"]*w-gl__description[^"]*"[^>]*>([\s\S]*?)<\/p>/gi;
  let match6;
  while ((match6 = resultRegex.exec(html)) !== null) {
    if (results.length >= maxResults)
      break;
    const url = match6[1].trim();
    const title = match6[2].replace(/<[^>]+>/g, "").trim();
    const snippet = match6[3].replace(/<[^>]+>/g, "").trim();
    if (!title || !url)
      continue;
    pos++;
    results.push(makeSearchResult({
      title,
      url,
      snippet: snippet.slice(0, 300),
      engine: "startpage",
      position: pos
    }));
  }
  if (results.length === 0) {
    const fallbackRegex = /<a[^>]*href="(https?:\/\/[^"]+)"[^>]*>[\s\S]*?<h[23][^>]*>([\s\S]*?)<\/h[23]>/gi;
    while ((match6 = fallbackRegex.exec(html)) !== null) {
      if (results.length >= maxResults)
        break;
      const url = match6[1].trim();
      const title = match6[2].replace(/<[^>]+>/g, "").trim();
      if (!title || !url || url.includes("startpage.com"))
        continue;
      pos++;
      results.push(makeSearchResult({
        title,
        url,
        snippet: "",
        engine: "startpage",
        position: pos
      }));
    }
  }
  return results;
}

// src/search/engines/chinaso.ts
var BASE_URL28 = "https://www.chinaso.com";
var USER_AGENT85 = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
function makeChinaso(config) {
  return {
    name: config.name,
    config,
    search: (http, query, opts) => searchChinaso(http, query, opts.numResults || config.maxResults, config.timeout)
  };
}
function searchChinaso(http, query, numResults, timeout3) {
  return exports_Effect.gen(function* () {
    const params = new URLSearchParams({
      q: query
    });
    const response = yield* http.execute(exports_HttpClientRequest.get(`${BASE_URL28}/search/?${params.toString()}`).pipe(exports_HttpClientRequest.setHeaders({
      "User-Agent": USER_AGENT85,
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8"
    }))).pipe(exports_Effect.timeout(timeout3));
    if (response.status < 200 || response.status >= 400)
      return [];
    const html = yield* response.text;
    if (!html)
      return [];
    return parseChinasoResults(html, numResults);
  });
}
function parseChinasoResults(html, maxResults) {
  const results = [];
  let pos = 0;
  const resultRegex = /<div[^>]*class="[^"]*result[^"]*"[^>]*>[\s\S]*?<a[^>]*href="([^"]*)"[^>]*>[\s\S]*?<h3[^>]*>([\s\S]*?)<\/h3>[\s\S]*?<p[^>]*class="[^"]*content[^"]*"[^>]*>([\s\S]*?)<\/p>/gi;
  let match6;
  while ((match6 = resultRegex.exec(html)) !== null) {
    if (results.length >= maxResults)
      break;
    const url = match6[1].trim();
    const title = match6[2].replace(/<[^>]+>/g, "").trim();
    const snippet = match6[3].replace(/<[^>]+>/g, "").trim();
    if (!title || !url)
      continue;
    pos++;
    results.push(makeSearchResult({
      title,
      url: url.startsWith("http") ? url : `${BASE_URL28}${url}`,
      snippet: snippet.slice(0, 300),
      engine: "chinaso",
      position: pos
    }));
  }
  if (results.length === 0) {
    const fallbackRegex = /<a[^>]*href="(https?:\/\/[^"]+)"[^>]*>[\s\S]*?<h[23][^>]*>([\s\S]*?)<\/h[23]>/gi;
    while ((match6 = fallbackRegex.exec(html)) !== null) {
      if (results.length >= maxResults)
        break;
      const url = match6[1].trim();
      const title = match6[2].replace(/<[^>]+>/g, "").trim();
      if (!title || !url || url.includes("chinaso.com"))
        continue;
      pos++;
      results.push(makeSearchResult({
        title,
        url,
        snippet: "",
        engine: "chinaso",
        position: pos
      }));
    }
  }
  return results;
}

// src/search/engines/piped.ts
var PIPED_INSTANCES = [
  "https://pipedapi.kavin.rocks",
  "https://pipedapi.adminforge.de",
  "https://api.piped.yt"
];
var USER_AGENT86 = "opencode-search/1.0";
function makePiped(config) {
  return {
    name: config.name,
    config,
    search: (http, query, opts) => searchPiped(http, query, opts.numResults || config.maxResults, config.timeout)
  };
}
function searchPiped(http, query, numResults, timeout3) {
  return exports_Effect.gen(function* () {
    const results = [];
    for (const instance of PIPED_INSTANCES) {
      if (results.length >= numResults)
        break;
      const params = new URLSearchParams({
        q: query,
        filter: "videos"
      });
      try {
        const response = yield* http.execute(exports_HttpClientRequest.get(`${instance}/search?${params.toString()}`).pipe(exports_HttpClientRequest.setHeaders({
          "User-Agent": USER_AGENT86,
          Accept: "application/json"
        }))).pipe(exports_Effect.timeout(timeout3));
        if (response.status < 200 || response.status >= 400)
          continue;
        const raw2 = yield* response.text;
        if (!raw2)
          continue;
        const instanceResults = parsePipedResults(raw2, numResults);
        results.push(...instanceResults);
      } catch {
        continue;
      }
    }
    return results.slice(0, numResults);
  });
}
function parsePipedResults(raw2, maxResults) {
  let parsed;
  try {
    parsed = JSON.parse(raw2);
  } catch {
    return [];
  }
  const data = parsed;
  const items = data?.items;
  if (!Array.isArray(items))
    return [];
  const results = [];
  let pos = 0;
  for (const item of items) {
    if (results.length >= maxResults)
      break;
    if (!item.title || !item.url)
      continue;
    const title = item.title;
    const author = item.uploaderName || "";
    const views = item.views ?? 0;
    const duration = item.duration ?? 0;
    const url = `https://piped.video${item.url}`;
    const parts2 = [];
    if (author)
      parts2.push(author);
    if (views > 0)
      parts2.push(`${formatViews(views)} views`);
    if (duration > 0)
      parts2.push(formatDuration(duration));
    const snippet = parts2.length > 0 ? `[${parts2.join(" · ")}]` : "Piped video";
    pos++;
    results.push(makeSearchResult({
      title,
      url,
      snippet: snippet.slice(0, 300),
      engine: "piped",
      position: pos,
      publishedDate: item.uploadedDate ? new Date(item.uploadedDate).getTime() : undefined,
      category: "video"
    }));
  }
  return results;
}
function formatViews(views) {
  if (views >= 1e6)
    return `${(views / 1e6).toFixed(1)}M`;
  if (views >= 1000)
    return `${(views / 1000).toFixed(1)}K`;
  return String(views);
}
function formatDuration(seconds2) {
  const h = Math.floor(seconds2 / 3600);
  const m = Math.floor(seconds2 % 3600 / 60);
  const s = seconds2 % 60;
  if (h > 0)
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

// src/search/engines/invidious.ts
var INVIDIOUS_INSTANCES = [
  "https://vid.puffyan.us",
  "https://invidious.nerdvpn.de",
  "https://invidious.privacyredirect.com"
];
var USER_AGENT87 = "opencode-search/1.0";
function makeInvidious(config) {
  return {
    name: config.name,
    config,
    search: (http, query, opts) => searchInvidious(http, query, opts.numResults || config.maxResults, config.timeout)
  };
}
function searchInvidious(http, query, numResults, timeout3) {
  return exports_Effect.gen(function* () {
    const results = [];
    for (const instance of INVIDIOUS_INSTANCES) {
      if (results.length >= numResults)
        break;
      const params = new URLSearchParams({
        q: query,
        type: "video"
      });
      try {
        const response = yield* http.execute(exports_HttpClientRequest.get(`${instance}/api/v1/search?${params.toString()}`).pipe(exports_HttpClientRequest.setHeaders({
          "User-Agent": USER_AGENT87,
          Accept: "application/json"
        }))).pipe(exports_Effect.timeout(timeout3));
        if (response.status < 200 || response.status >= 400)
          continue;
        const raw2 = yield* response.text;
        if (!raw2)
          continue;
        const instanceResults = parseInvidiousResults(raw2, numResults);
        results.push(...instanceResults);
      } catch {
        continue;
      }
    }
    return results.slice(0, numResults);
  });
}
function parseInvidiousResults(raw2, maxResults) {
  let parsed;
  try {
    parsed = JSON.parse(raw2);
  } catch {
    return [];
  }
  const items = parsed;
  if (!Array.isArray(items))
    return [];
  const results = [];
  let pos = 0;
  for (const item of items) {
    if (results.length >= maxResults)
      break;
    if (!item.title || !item.videoId)
      continue;
    const title = item.title;
    const author = item.author || "";
    const views = item.viewCount ?? 0;
    const duration = item.lengthSeconds ?? 0;
    const url = `https://invidious.nerdvpn.de/watch?v=${item.videoId}`;
    const parts2 = [];
    if (author)
      parts2.push(author);
    if (views > 0)
      parts2.push(`${formatViews2(views)} views`);
    if (duration > 0)
      parts2.push(formatDuration2(duration));
    if (item.publishedText)
      parts2.push(item.publishedText);
    const snippet = parts2.length > 0 ? `[${parts2.join(" · ")}] ${(item.description || "").slice(0, 150)}`.trim() : item.description?.slice(0, 300) || "Invidious video";
    pos++;
    results.push(makeSearchResult({
      title,
      url,
      snippet: snippet.slice(0, 300),
      engine: "invidious",
      position: pos,
      category: "video"
    }));
  }
  return results;
}
function formatViews2(views) {
  if (views >= 1e6)
    return `${(views / 1e6).toFixed(1)}M`;
  if (views >= 1000)
    return `${(views / 1000).toFixed(1)}K`;
  return String(views);
}
function formatDuration2(seconds2) {
  const h = Math.floor(seconds2 / 3600);
  const m = Math.floor(seconds2 % 3600 / 60);
  const s = seconds2 % 60;
  if (h > 0)
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

// src/search/engines/discourse.ts
var USER_AGENT88 = "opencode-search/1.0";
function makeDiscourse(config, baseUrl2 = "https://meta.discourse.org") {
  return {
    name: config.name,
    config,
    search: (http, query, opts) => searchDiscourse(http, query, opts.numResults || config.maxResults, config.timeout, baseUrl2)
  };
}
function searchDiscourse(http, query, numResults, timeout3, baseUrl2) {
  return exports_Effect.gen(function* () {
    const params = new URLSearchParams({
      q: `${query} order:latest`
    });
    const response = yield* http.execute(exports_HttpClientRequest.get(`${baseUrl2}/search.json?${params.toString()}`).pipe(exports_HttpClientRequest.setHeaders({
      "User-Agent": USER_AGENT88,
      Accept: "application/json",
      "X-Requested-With": "XMLHttpRequest"
    }))).pipe(exports_Effect.timeout(timeout3));
    if (response.status < 200 || response.status >= 400)
      return [];
    const raw2 = yield* response.text;
    if (!raw2)
      return [];
    return parseDiscourseResults(raw2, numResults, baseUrl2);
  });
}
function parseDiscourseResults(raw2, maxResults, baseUrl2) {
  let parsed;
  try {
    parsed = JSON.parse(raw2);
  } catch {
    return [];
  }
  const data = parsed;
  const posts = data?.posts;
  const topics = data?.topics;
  if (!Array.isArray(posts))
    return [];
  const topicMap = new Map;
  if (Array.isArray(topics)) {
    for (const topic of topics) {
      if (topic.id)
        topicMap.set(topic.id, topic);
    }
  }
  const results = [];
  let pos = 0;
  for (const post3 of posts) {
    if (results.length >= maxResults)
      break;
    if (!post3.id || !post3.topic_id)
      continue;
    const topic = topicMap.get(post3.topic_id);
    const title = topic?.title || `Post #${post3.id}`;
    const url = `${baseUrl2}/p/${post3.id}`;
    const author = post3.username || "";
    const comments = topic?.posts_count || 0;
    const status = topic?.closed ? "closed" : "open";
    const parts2 = [];
    if (author)
      parts2.push(`@${author}`);
    if (comments > 1)
      parts2.push(`${comments} comments`);
    if (topic?.has_accepted_answer)
      parts2.push("answered");
    else if (comments > 1)
      parts2.push(status);
    pos++;
    results.push(makeSearchResult({
      title,
      url,
      snippet: post3.blurb || parts2.join(" · ") || "Discourse post",
      engine: "discourse",
      position: pos,
      publishedDate: topic?.created_at ? new Date(topic.created_at).getTime() : undefined,
      category: "social"
    }));
  }
  return results;
}

// src/search/engines/quark.ts
var BASE_URL29 = "https://quark.sm.cn";
var USER_AGENT89 = "Mozilla/5.0 (Linux; Android 12; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36";
function makeQuark(config) {
  return {
    name: config.name,
    config,
    search: (http, query, opts) => searchQuark(http, query, opts.numResults || config.maxResults, config.timeout)
  };
}
function searchQuark(http, query, numResults, timeout3) {
  return exports_Effect.gen(function* () {
    const params = new URLSearchParams({
      q: query,
      from: "smor",
      safe: "1"
    });
    const response = yield* http.execute(exports_HttpClientRequest.get(`${BASE_URL29}/s?${params.toString()}`).pipe(exports_HttpClientRequest.setHeaders({
      "User-Agent": USER_AGENT89,
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "zh-CN,zh;q=0.9"
    }))).pipe(exports_Effect.timeout(timeout3));
    if (response.status < 200 || response.status >= 400)
      return [];
    const html = yield* response.text;
    if (!html)
      return [];
    return parseQuarkResults(html, numResults);
  });
}
function parseQuarkResults(html, maxResults) {
  const results = [];
  let pos = 0;
  const resultRegex = /<div[^>]*class="[^"]*result[^"]*"[^>]*>[\s\S]*?<a[^>]*href="([^"]*)"[^>]*>[\s\S]*?<h3[^>]*>([\s\S]*?)<\/h3>[\s\S]*?<p[^>]*class="[^"]*content[^"]*"[^>]*>([\s\S]*?)<\/p>/gi;
  let match6;
  while ((match6 = resultRegex.exec(html)) !== null) {
    if (results.length >= maxResults)
      break;
    const url = match6[1].trim();
    const title = match6[2].replace(/<[^>]+>/g, "").trim();
    const snippet = match6[3].replace(/<[^>]+>/g, "").trim();
    if (!title || !url)
      continue;
    pos++;
    results.push(makeSearchResult({
      title,
      url: url.startsWith("http") ? url : `${BASE_URL29}${url}`,
      snippet: snippet.slice(0, 300),
      engine: "quark",
      position: pos
    }));
  }
  if (results.length === 0) {
    const fallbackRegex = /<a[^>]*href="(https?:\/\/[^"]+)"[^>]*>[\s\S]*?<h[23][^>]*>([\s\S]*?)<\/h[23]>/gi;
    while ((match6 = fallbackRegex.exec(html)) !== null) {
      if (results.length >= maxResults)
        break;
      const url = match6[1].trim();
      const title = match6[2].replace(/<[^>]+>/g, "").trim();
      if (!title || !url || url.includes("quark.sm.cn"))
        continue;
      pos++;
      results.push(makeSearchResult({
        title,
        url,
        snippet: "",
        engine: "quark",
        position: pos
      }));
    }
  }
  return results;
}

// src/search/engines/odysee.ts
var API_URL30 = "https://api.na-backend.odysee.com/api/v1/proxy";
var WEB_URL2 = "https://odysee.com";
var USER_AGENT90 = "opencode-search/1.0";
function makeOdysee(config) {
  return {
    name: config.name,
    config,
    search: (http, query, opts) => searchOdysee(http, query, opts.numResults || config.maxResults, config.timeout)
  };
}
function searchOdysee(http, query, numResults, timeout3) {
  return exports_Effect.gen(function* () {
    const body = JSON.stringify({
      jsonrpc: "2.0",
      method: "search",
      params: {
        query,
        page: 1,
        limit: Math.min(numResults, 20),
        nsfw: false
      }
    });
    const response = yield* http.execute(exports_HttpClientRequest.post(API_URL30).pipe(exports_HttpClientRequest.setHeaders({
      "User-Agent": USER_AGENT90,
      "Content-Type": "application/json",
      Accept: "application/json"
    }), exports_HttpClientRequest.bodyText(body))).pipe(exports_Effect.timeout(timeout3));
    if (response.status < 200 || response.status >= 400)
      return [];
    const raw2 = yield* response.text;
    if (!raw2)
      return [];
    return parseOdyseeResults(raw2, numResults);
  });
}
function parseOdyseeResults(raw2, maxResults) {
  let parsed;
  try {
    parsed = JSON.parse(raw2);
  } catch {
    return [];
  }
  const data = parsed;
  const items = data?.result;
  if (!Array.isArray(items))
    return [];
  const results = [];
  let pos = 0;
  for (const item of items) {
    if (results.length >= maxResults)
      break;
    if (!item.title && !item.name)
      continue;
    const title = item.title || item.name || "";
    const author = item.channel_name || "";
    const views = item.view_count ?? 0;
    const duration = item.duration ?? 0;
    const url = `${WEB_URL2}/${item.channel_name || ""}/${item.name || item.claim_id || ""}`;
    const parts2 = [];
    if (author)
      parts2.push(author);
    if (views > 0)
      parts2.push(`${formatViews3(views)} views`);
    if (duration > 0)
      parts2.push(formatDuration3(duration));
    const snippet = parts2.length > 0 ? `[${parts2.join(" · ")}] ${(item.description || "").slice(0, 150)}`.trim() : item.description?.slice(0, 300) || "Odysee video";
    pos++;
    results.push(makeSearchResult({
      title,
      url,
      snippet: snippet.slice(0, 300),
      engine: "odysee",
      position: pos,
      publishedDate: item.creation_timestamp ? item.creation_timestamp * 1000 : undefined,
      category: "video"
    }));
  }
  return results;
}
function formatViews3(views) {
  if (views >= 1e6)
    return `${(views / 1e6).toFixed(1)}M`;
  if (views >= 1000)
    return `${(views / 1000).toFixed(1)}K`;
  return String(views);
}
function formatDuration3(seconds2) {
  const h = Math.floor(seconds2 / 3600);
  const m = Math.floor(seconds2 % 3600 / 60);
  const s = seconds2 % 60;
  if (h > 0)
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

// src/search/engines/boardreader.ts
var BASE_URL30 = "https://boardreader.com";
var USER_AGENT91 = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
function makeBoardreader(config) {
  return {
    name: config.name,
    config,
    search: (http, query, opts) => searchBoardreader(http, query, opts.numResults || config.maxResults, config.timeout)
  };
}
function searchBoardreader(http, query, numResults, timeout3) {
  return exports_Effect.gen(function* () {
    const params = new URLSearchParams({
      q: query
    });
    const response = yield* http.execute(exports_HttpClientRequest.get(`${BASE_URL30}/search.php?${params.toString()}`).pipe(exports_HttpClientRequest.setHeaders({
      "User-Agent": USER_AGENT91,
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
    }))).pipe(exports_Effect.timeout(timeout3));
    if (response.status < 200 || response.status >= 400)
      return [];
    const html = yield* response.text;
    if (!html)
      return [];
    return parseBoardreaderResults(html, numResults);
  });
}
function parseBoardreaderResults(html, maxResults) {
  const results = [];
  let pos = 0;
  const resultRegex = /<div[^>]*class="[^"]*result[^"]*"[^>]*>[\s\S]*?<a[^>]*href="([^"]*)"[^>]*>[\s\S]*?<span[^>]*class="[^"]*title[^"]*"[^>]*>([\s\S]*?)<\/span>[\s\S]*?<span[^>]*class="[^"]*snippet[^"]*"[^>]*>([\s\S]*?)<\/span>/gi;
  let match6;
  while ((match6 = resultRegex.exec(html)) !== null) {
    if (results.length >= maxResults)
      break;
    const url = match6[1].trim();
    const title = match6[2].replace(/<[^>]+>/g, "").trim();
    const snippet = match6[3].replace(/<[^>]+>/g, "").trim();
    if (!title || !url)
      continue;
    pos++;
    results.push(makeSearchResult({
      title,
      url: url.startsWith("http") ? url : `${BASE_URL30}${url}`,
      snippet: snippet.slice(0, 300),
      engine: "boardreader",
      position: pos,
      category: "social"
    }));
  }
  if (results.length === 0) {
    const fallbackRegex = /<a[^>]*href="(https?:\/\/[^"]+)"[^>]*>[\s\S]*?<h[23][^>]*>([\s\S]*?)<\/h[23]>/gi;
    while ((match6 = fallbackRegex.exec(html)) !== null) {
      if (results.length >= maxResults)
        break;
      const url = match6[1].trim();
      const title = match6[2].replace(/<[^>]+>/g, "").trim();
      if (!title || !url || url.includes("boardreader.com"))
        continue;
      pos++;
      results.push(makeSearchResult({
        title,
        url,
        snippet: "",
        engine: "boardreader",
        position: pos,
        category: "social"
      }));
    }
  }
  return results;
}

// src/search/engines/mwmbl.ts
var API_URL31 = "https://api.mwmbl.me/search";
var USER_AGENT92 = "opencode-search/1.0";
function makeMwmbl(config) {
  return {
    name: config.name,
    config,
    search: (http, query, opts) => searchMwmbl(http, query, opts.numResults || config.maxResults, config.timeout)
  };
}
function searchMwmbl(http, query, numResults, timeout3) {
  return exports_Effect.gen(function* () {
    const params = new URLSearchParams({
      q: query
    });
    const response = yield* http.execute(exports_HttpClientRequest.get(`${API_URL31}?${params.toString()}`).pipe(exports_HttpClientRequest.setHeaders({
      "User-Agent": USER_AGENT92,
      Accept: "application/json"
    }))).pipe(exports_Effect.timeout(timeout3));
    if (response.status < 200 || response.status >= 400)
      return [];
    const raw2 = yield* response.text;
    if (!raw2)
      return [];
    return parseMwmblResults(raw2, numResults);
  });
}
function parseMwmblResults(raw2, maxResults) {
  let parsed;
  try {
    parsed = JSON.parse(raw2);
  } catch {
    return [];
  }
  const data = parsed;
  const items = data?.results;
  if (!Array.isArray(items))
    return [];
  const results = [];
  let pos = 0;
  for (const item of items) {
    if (results.length >= maxResults)
      break;
    if (!item.title || !item.url)
      continue;
    const title = item.title;
    const url = item.url;
    const snippet = (item.snippet || "").replace(/<[^>]+>/g, "").trim();
    pos++;
    results.push(makeSearchResult({
      title,
      url,
      snippet: snippet.slice(0, 300),
      engine: "mwmbl",
      position: pos
    }));
  }
  return results;
}

// src/search/engines/seznam.ts
var BASE_URL31 = "https://search.seznam.cz";
var USER_AGENT93 = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
function makeSeznam(config) {
  return {
    name: config.name,
    config,
    search: (http, query, opts) => searchSeznam(http, query, opts.numResults || config.maxResults, config.timeout)
  };
}
function searchSeznam(http, query, numResults, timeout3) {
  return exports_Effect.gen(function* () {
    const params = new URLSearchParams({
      q: query
    });
    const response = yield* http.execute(exports_HttpClientRequest.get(`${BASE_URL31}/?${params.toString()}`).pipe(exports_HttpClientRequest.setHeaders({
      "User-Agent": USER_AGENT93,
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "cs,en;q=0.9"
    }))).pipe(exports_Effect.timeout(timeout3));
    if (response.status < 200 || response.status >= 400)
      return [];
    const html = yield* response.text;
    if (!html)
      return [];
    return parseSeznamResults(html, numResults);
  });
}
function parseSeznamResults(html, maxResults) {
  const results = [];
  let pos = 0;
  const resultRegex = /<div[^>]*class="[^"]*result[^"]*"[^>]*>[\s\S]*?<a[^>]*href="([^"]*)"[^>]*>[\s\S]*?<h3[^>]*>([\s\S]*?)<\/h3>[\s\S]*?<p[^>]*class="[^"]*snippet[^"]*"[^>]*>([\s\S]*?)<\/p>/gi;
  let match6;
  while ((match6 = resultRegex.exec(html)) !== null) {
    if (results.length >= maxResults)
      break;
    const url = match6[1].trim();
    const title = match6[2].replace(/<[^>]+>/g, "").trim();
    const snippet = match6[3].replace(/<[^>]+>/g, "").trim();
    if (!title || !url)
      continue;
    pos++;
    results.push(makeSearchResult({
      title,
      url: url.startsWith("http") ? url : `${BASE_URL31}${url}`,
      snippet: snippet.slice(0, 300),
      engine: "seznam",
      position: pos
    }));
  }
  if (results.length === 0) {
    const fallbackRegex = /<a[^>]*href="(https?:\/\/[^"]+)"[^>]*>[\s\S]*?<h[23][^>]*>([\s\S]*?)<\/h[23]>/gi;
    while ((match6 = fallbackRegex.exec(html)) !== null) {
      if (results.length >= maxResults)
        break;
      const url = match6[1].trim();
      const title = match6[2].replace(/<[^>]+>/g, "").trim();
      if (!title || !url || url.includes("seznam.cz"))
        continue;
      pos++;
      results.push(makeSearchResult({
        title,
        url,
        snippet: "",
        engine: "seznam",
        position: pos
      }));
    }
  }
  return results;
}

// src/search/engines/aol.ts
var BASE_URL32 = "https://search.aol.com";
var USER_AGENT94 = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
function makeAol(config) {
  return {
    name: config.name,
    config,
    search: (http, query, opts) => searchAol(http, query, opts.numResults || config.maxResults, config.timeout)
  };
}
function searchAol(http, query, numResults, timeout3) {
  return exports_Effect.gen(function* () {
    const params = new URLSearchParams({
      q: query
    });
    const response = yield* http.execute(exports_HttpClientRequest.get(`${BASE_URL32}/aol/search?${params.toString()}`).pipe(exports_HttpClientRequest.setHeaders({
      "User-Agent": USER_AGENT94,
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
    }))).pipe(exports_Effect.timeout(timeout3));
    if (response.status < 200 || response.status >= 400)
      return [];
    const html = yield* response.text;
    if (!html)
      return [];
    return parseAolResults(html, numResults);
  });
}
function parseAolResults(html, maxResults) {
  const results = [];
  let pos = 0;
  const resultRegex = /<div[^>]*class="[^"]*algo[^"]*"[^>]*>[\s\S]*?<a[^>]*href="([^"]*)"[^>]*>[\s\S]*?<h3[^>]*>([\s\S]*?)<\/h3>[\s\S]*?<p[^>]*class="[^"]*fz-ms[^"]*"[^>]*>([\s\S]*?)<\/p>/gi;
  let match6;
  while ((match6 = resultRegex.exec(html)) !== null) {
    if (results.length >= maxResults)
      break;
    const url = match6[1].trim();
    const title = match6[2].replace(/<[^>]+>/g, "").trim();
    const snippet = match6[3].replace(/<[^>]+>/g, "").trim();
    if (!title || !url)
      continue;
    pos++;
    results.push(makeSearchResult({
      title,
      url: url.startsWith("http") ? url : `${BASE_URL32}${url}`,
      snippet: snippet.slice(0, 300),
      engine: "aol",
      position: pos
    }));
  }
  if (results.length === 0) {
    const fallbackRegex = /<a[^>]*href="(https?:\/\/[^"]+)"[^>]*>[\s\S]*?<h[23][^>]*>([\s\S]*?)<\/h[23]>/gi;
    while ((match6 = fallbackRegex.exec(html)) !== null) {
      if (results.length >= maxResults)
        break;
      const url = match6[1].trim();
      const title = match6[2].replace(/<[^>]+>/g, "").trim();
      if (!title || !url || url.includes("aol.com"))
        continue;
      pos++;
      results.push(makeSearchResult({
        title,
        url,
        snippet: "",
        engine: "aol",
        position: pos
      }));
    }
  }
  return results;
}

// src/search/engines/gmx.ts
var BASE_URL33 = "https://suche.gmx.net";
var USER_AGENT95 = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
function makeGmx(config) {
  return {
    name: config.name,
    config,
    search: (http, query, opts) => searchGmx(http, query, opts.numResults || config.maxResults, config.timeout)
  };
}
function searchGmx(http, query, numResults, timeout3) {
  return exports_Effect.gen(function* () {
    const params = new URLSearchParams({
      q: query
    });
    const response = yield* http.execute(exports_HttpClientRequest.get(`${BASE_URL33}/search?${params.toString()}`).pipe(exports_HttpClientRequest.setHeaders({
      "User-Agent": USER_AGENT95,
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "de,en;q=0.9"
    }))).pipe(exports_Effect.timeout(timeout3));
    if (response.status < 200 || response.status >= 400)
      return [];
    const html = yield* response.text;
    if (!html)
      return [];
    return parseGmxResults(html, numResults);
  });
}
function parseGmxResults(html, maxResults) {
  const results = [];
  let pos = 0;
  const resultRegex = /<div[^>]*class="[^"]*algo[^"]*"[^>]*>[\s\S]*?<a[^>]*href="([^"]*)"[^>]*>[\s\S]*?<h3[^>]*>([\s\S]*?)<\/h3>[\s\S]*?<p[^>]*class="[^"]*fz-ms[^"]*"[^>]*>([\s\S]*?)<\/p>/gi;
  let match6;
  while ((match6 = resultRegex.exec(html)) !== null) {
    if (results.length >= maxResults)
      break;
    const url = match6[1].trim();
    const title = match6[2].replace(/<[^>]+>/g, "").trim();
    const snippet = match6[3].replace(/<[^>]+>/g, "").trim();
    if (!title || !url)
      continue;
    pos++;
    results.push(makeSearchResult({
      title,
      url: url.startsWith("http") ? url : `${BASE_URL33}${url}`,
      snippet: snippet.slice(0, 300),
      engine: "gmx",
      position: pos
    }));
  }
  if (results.length === 0) {
    const fallbackRegex = /<a[^>]*href="(https?:\/\/[^"]+)"[^>]*>[\s\S]*?<h[23][^>]*>([\s\S]*?)<\/h[23]>/gi;
    while ((match6 = fallbackRegex.exec(html)) !== null) {
      if (results.length >= maxResults)
        break;
      const url = match6[1].trim();
      const title = match6[2].replace(/<[^>]+>/g, "").trim();
      if (!title || !url || url.includes("gmx.net"))
        continue;
      pos++;
      results.push(makeSearchResult({
        title,
        url,
        snippet: "",
        engine: "gmx",
        position: pos
      }));
    }
  }
  return results;
}

// src/search/engines/yep.ts
var BASE_URL34 = "https://yep.com";
var USER_AGENT96 = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
function makeYep(config) {
  return {
    name: config.name,
    config,
    search: (http, query, opts) => searchYep(http, query, opts.numResults || config.maxResults, config.timeout)
  };
}
function searchYep(http, query, numResults, timeout3) {
  return exports_Effect.gen(function* () {
    const params = new URLSearchParams({
      q: query
    });
    const response = yield* http.execute(exports_HttpClientRequest.get(`${BASE_URL34}/search?${params.toString()}`).pipe(exports_HttpClientRequest.setHeaders({
      "User-Agent": USER_AGENT96,
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
    }))).pipe(exports_Effect.timeout(timeout3));
    if (response.status < 200 || response.status >= 400)
      return [];
    const html = yield* response.text;
    if (!html)
      return [];
    return parseYepResults(html, numResults);
  });
}
function parseYepResults(html, maxResults) {
  const results = [];
  let pos = 0;
  const resultRegex = /<div[^>]*class="[^"]*result[^"]*"[^>]*>[\s\S]*?<a[^>]*href="([^"]*)"[^>]*>[\s\S]*?<h3[^>]*>([\s\S]*?)<\/h3>[\s\S]*?<p[^>]*class="[^"]*snippet[^"]*"[^>]*>([\s\S]*?)<\/p>/gi;
  let match6;
  while ((match6 = resultRegex.exec(html)) !== null) {
    if (results.length >= maxResults)
      break;
    const url = match6[1].trim();
    const title = match6[2].replace(/<[^>]+>/g, "").trim();
    const snippet = match6[3].replace(/<[^>]+>/g, "").trim();
    if (!title || !url)
      continue;
    pos++;
    results.push(makeSearchResult({
      title,
      url: url.startsWith("http") ? url : `${BASE_URL34}${url}`,
      snippet: snippet.slice(0, 300),
      engine: "yep",
      position: pos
    }));
  }
  if (results.length === 0) {
    const fallbackRegex = /<a[^>]*href="(https?:\/\/[^"]+)"[^>]*>[\s\S]*?<h[23][^>]*>([\s\S]*?)<\/h[23]>/gi;
    while ((match6 = fallbackRegex.exec(html)) !== null) {
      if (results.length >= maxResults)
        break;
      const url = match6[1].trim();
      const title = match6[2].replace(/<[^>]+>/g, "").trim();
      if (!title || !url || url.includes("yep.com"))
        continue;
      pos++;
      results.push(makeSearchResult({
        title,
        url,
        snippet: "",
        engine: "yep",
        position: pos
      }));
    }
  }
  return results;
}

// src/search/engines/tineye.ts
var BASE_URL35 = "https://tineye.com";
var USER_AGENT97 = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
function makeTinEye(config) {
  return {
    name: config.name,
    config,
    search: (http, query, opts) => searchTinEye(http, query, opts.numResults || config.maxResults, config.timeout)
  };
}
function searchTinEye(http, query, numResults, timeout3) {
  return exports_Effect.gen(function* () {
    const params = new URLSearchParams({
      url: query
    });
    const response = yield* http.execute(exports_HttpClientRequest.get(`${BASE_URL35}/api/v1/result_json/?${params.toString()}`).pipe(exports_HttpClientRequest.setHeaders({
      "User-Agent": USER_AGENT97,
      Accept: "application/json"
    }))).pipe(exports_Effect.timeout(timeout3));
    if (response.status < 200 || response.status >= 400)
      return [];
    const raw2 = yield* response.text;
    if (!raw2)
      return [];
    return parseTinEyeResults(raw2, numResults);
  });
}
function parseTinEyeResults(raw2, maxResults) {
  let parsed;
  try {
    parsed = JSON.parse(raw2);
  } catch {
    return [];
  }
  const data = parsed;
  const matches = data?.matches;
  if (!Array.isArray(matches))
    return [];
  const results = [];
  let pos = 0;
  for (const match6 of matches) {
    if (results.length >= maxResults)
      break;
    if (!match6.backlinks?.length)
      continue;
    const backlink = match6.backlinks[0];
    const url = backlink?.backlink || "";
    if (!url)
      continue;
    const score = match6.score || 0;
    const domain = match6.domain || "";
    pos++;
    results.push(makeSearchResult({
      title: `TinEye match (${score}% similarity)`,
      url,
      snippet: domain ? `Found on ${domain}` : "TinEye reverse image search",
      engine: "tineye",
      position: pos,
      category: "image"
    }));
  }
  return results;
}

// src/search/engines/yandex-music.ts
var BASE_URL36 = "https://music.yandex.ru";
var USER_AGENT98 = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
function makeYandexMusic(config) {
  return {
    name: config.name,
    config,
    search: (http, query, opts) => searchYandexMusic(http, query, opts.numResults || config.maxResults, config.timeout)
  };
}
function searchYandexMusic(http, query, numResults, timeout3) {
  return exports_Effect.gen(function* () {
    const params = new URLSearchParams({
      text: query,
      page: "0"
    });
    const response = yield* http.execute(exports_HttpClientRequest.get(`${BASE_URL36}/handlers/music-search.jsx?${params.toString()}`).pipe(exports_HttpClientRequest.setHeaders({
      "User-Agent": USER_AGENT98,
      Accept: "application/json"
    }))).pipe(exports_Effect.timeout(timeout3));
    if (response.status < 200 || response.status >= 400)
      return [];
    const raw2 = yield* response.text;
    if (!raw2)
      return [];
    return parseYandexMusicResults(raw2, numResults);
  });
}
function parseYandexMusicResults(raw2, maxResults) {
  let parsed;
  try {
    parsed = JSON.parse(raw2);
  } catch {
    return [];
  }
  const data = parsed;
  const tracks = data?.tracks?.items;
  if (!Array.isArray(tracks))
    return [];
  const results = [];
  let pos = 0;
  for (const track2 of tracks) {
    if (results.length >= maxResults)
      break;
    if (track2.type !== "music" || !track2.title)
      continue;
    const trackId = track2.id;
    const albumId = track2.albums?.[0]?.id;
    if (!trackId || !albumId)
      continue;
    const url = `${BASE_URL36}/album/${albumId}/track/${trackId}`;
    const album = track2.albums?.[0]?.title || "";
    const artist = track2.artists?.[0]?.name || "";
    const content = `[${album}] ${artist} - ${track2.title}`;
    pos++;
    results.push(makeSearchResult({
      title: track2.title,
      url,
      snippet: content,
      engine: "yandex-music",
      position: pos,
      category: "music"
    }));
  }
  return results;
}

// src/search/engines/lingva.ts
var BASE_URL37 = "https://lingva.ml";
var USER_AGENT99 = "opencode-search/1.0";
function makeLingva(config) {
  return {
    name: config.name,
    config,
    search: (http, query, opts) => searchLingva(http, query, opts.numResults || config.maxResults, config.timeout)
  };
}
function searchLingva(http, query, numResults, timeout3) {
  return exports_Effect.gen(function* () {
    const parts2 = query.split(" ");
    let fromLang = "auto";
    let toLang = "en";
    let text2 = query;
    if (parts2.length >= 3) {
      text2 = parts2.slice(0, -2).join(" ");
      fromLang = parts2[parts2.length - 2];
      toLang = parts2[parts2.length - 1];
    } else if (parts2.length === 2) {
      text2 = parts2[0];
      toLang = parts2[1];
    }
    const response = yield* http.execute(exports_HttpClientRequest.get(`${BASE_URL37}/api/v1/${fromLang}/${toLang}/${encodeURIComponent(text2)}`).pipe(exports_HttpClientRequest.setHeaders({
      "User-Agent": USER_AGENT99,
      Accept: "application/json"
    }))).pipe(exports_Effect.timeout(timeout3));
    if (response.status < 200 || response.status >= 400)
      return [];
    const raw2 = yield* response.text;
    if (!raw2)
      return [];
    return parseLingvaResults(raw2, text2, fromLang, toLang);
  });
}
function parseLingvaResults(raw2, query, fromLang, toLang) {
  let parsed;
  try {
    parsed = JSON.parse(raw2);
  } catch {
    return [];
  }
  const data = parsed;
  const translation = data.translation;
  if (!translation)
    return [];
  const results = [];
  results.push(makeSearchResult({
    title: `${query} → ${translation}`,
    url: `${BASE_URL37}/${fromLang}/${toLang}/${encodeURIComponent(query)}`,
    snippet: `Translation (${fromLang} → ${toLang}): ${translation}`,
    engine: "lingva",
    position: 1,
    category: "general"
  }));
  const definitions = data.info?.definitions;
  if (definitions) {
    let pos = 2;
    for (const def of definitions) {
      if (pos > 5)
        break;
      for (const item of def.list || []) {
        if (pos > 5)
          break;
        if (item.definition) {
          results.push(makeSearchResult({
            title: `Definition: ${item.definition}`,
            url: `${BASE_URL37}/${fromLang}/${toLang}/${encodeURIComponent(query)}`,
            snippet: item.example || "",
            engine: "lingva",
            position: pos,
            category: "general"
          }));
          pos++;
        }
      }
    }
  }
  return results;
}

// src/search/engines/libretranslate.ts
var API_URL32 = "https://libretranslate.com/translate";
var USER_AGENT100 = "opencode-search/1.0";
function makeLibreTranslate(config) {
  return {
    name: config.name,
    config,
    search: (http, query, opts) => searchLibreTranslate(http, query, opts.numResults || config.maxResults, config.timeout)
  };
}
function searchLibreTranslate(http, query, numResults, timeout3) {
  return exports_Effect.gen(function* () {
    const parts2 = query.split(" ");
    let fromLang = "en";
    let toLang = "zh";
    let text2 = query;
    if (parts2.length >= 3) {
      text2 = parts2.slice(0, -2).join(" ");
      fromLang = parts2[parts2.length - 2];
      toLang = parts2[parts2.length - 1];
    } else if (parts2.length === 2) {
      text2 = parts2[0];
      toLang = parts2[1];
    }
    const body = JSON.stringify({
      q: text2,
      source: fromLang,
      target: toLang,
      alternatives: 3
    });
    const response = yield* http.execute(exports_HttpClientRequest.post(API_URL32).pipe(exports_HttpClientRequest.setHeaders({
      "User-Agent": USER_AGENT100,
      "Content-Type": "application/json",
      Accept: "application/json"
    }), exports_HttpClientRequest.bodyText(body))).pipe(exports_Effect.timeout(timeout3));
    if (response.status < 200 || response.status >= 400)
      return [];
    const raw2 = yield* response.text;
    if (!raw2)
      return [];
    return parseLibreTranslateResults(raw2, text2, fromLang, toLang);
  });
}
function parseLibreTranslateResults(raw2, query, fromLang, toLang) {
  let parsed;
  try {
    parsed = JSON.parse(raw2);
  } catch {
    return [];
  }
  const data = parsed;
  const translation = data.translatedText;
  if (!translation)
    return [];
  const results = [];
  results.push(makeSearchResult({
    title: `${query} → ${translation}`,
    url: `https://libretranslate.com/?source=${fromLang}&target=${toLang}&q=${encodeURIComponent(query)}`,
    snippet: `Translation (${fromLang} → ${toLang}): ${translation}`,
    engine: "libretranslate",
    position: 1,
    category: "general"
  }));
  const alternatives = data.alternatives;
  if (alternatives) {
    let pos = 2;
    for (const alt of alternatives) {
      if (pos > 5)
        break;
      results.push(makeSearchResult({
        title: `Alternative: ${alt}`,
        url: `https://libretranslate.com/?source=${fromLang}&target=${toLang}&q=${encodeURIComponent(query)}`,
        snippet: `Alternative translation`,
        engine: "libretranslate",
        position: pos,
        category: "general"
      }));
      pos++;
    }
  }
  return results;
}

// src/search/engines/deepl.ts
var API_URL33 = "https://api-free.deepl.com/v2/translate";
var WEB_URL3 = "https://www.deepl.com/translator";
var USER_AGENT101 = "opencode-search/1.0";
function makeDeepL(config) {
  return {
    name: config.name,
    config,
    search: (http, query, opts) => searchDeepL(http, query, opts.numResults || config.maxResults, config.timeout)
  };
}
function searchDeepL(http, query, numResults, timeout3) {
  return exports_Effect.gen(function* () {
    const parts2 = query.split(" ");
    let targetLang = "ZH";
    let text2 = query;
    if (parts2.length >= 2) {
      text2 = parts2.slice(0, -1).join(" ");
      const langHint = parts2[parts2.length - 1].toUpperCase();
      const langMap = {
        ZH: "ZH",
        "ZH-CN": "ZH",
        "ZH-TW": "ZH",
        EN: "EN-US",
        "EN-US": "EN-US",
        "EN-GB": "EN-GB",
        JA: "JA",
        KO: "KO",
        FR: "FR",
        DE: "DE",
        ES: "ES",
        IT: "IT",
        PT: "PT",
        "PT-BR": "PT-BR",
        "PT-PT": "PT-PT",
        RU: "RU",
        AR: "AR",
        NL: "NL",
        PL: "PL",
        SV: "SV",
        DA: "DA",
        FI: "FI",
        CS: "CS",
        EL: "EL",
        HU: "HU",
        RO: "RO",
        SK: "SK",
        BG: "BG",
        SL: "SL",
        ET: "ET",
        LT: "LT",
        LV: "LV",
        UK: "UK",
        ID: "ID",
        MS: "MS",
        TH: "TH",
        TR: "TR",
        VI: "VI"
      };
      if (langMap[langHint])
        targetLang = langMap[langHint];
      else if (langHint.length === 2)
        targetLang = langHint;
    }
    const apiKey = process.env.DEEPL_API_KEY;
    if (apiKey) {
      const body = new URLSearchParams({
        auth_key: apiKey,
        text: text2,
        target_lang: targetLang
      }).toString();
      const response = yield* http.execute(exports_HttpClientRequest.post(API_URL33).pipe(exports_HttpClientRequest.setHeaders({
        "User-Agent": USER_AGENT101,
        "Content-Type": "application/x-www-form-urlencoded"
      }), exports_HttpClientRequest.bodyText(body))).pipe(exports_Effect.timeout(timeout3));
      if (response.status >= 200 && response.status < 400) {
        const raw2 = yield* response.text;
        if (raw2) {
          const results = parseDeepLApiResults(raw2, text2, targetLang);
          if (results.length > 0)
            return results;
        }
      }
    }
    return [];
  });
}
function parseDeepLApiResults(raw2, query, targetLang) {
  let parsed;
  try {
    parsed = JSON.parse(raw2);
  } catch {
    return [];
  }
  const data = parsed;
  const translations = data.translations;
  if (!Array.isArray(translations) || translations.length === 0)
    return [];
  const results = [];
  let pos = 0;
  for (const t of translations) {
    if (results.length >= 3)
      break;
    if (!t.text)
      continue;
    const srcLang = t.detected_source_language || "?";
    pos++;
    results.push(makeSearchResult({
      title: `${query} → ${t.text}`,
      url: `${WEB_URL3}#${srcLang}/${targetLang}/${encodeURIComponent(query)}`,
      snippet: `Translation (${srcLang} → ${targetLang}): ${t.text}`,
      engine: "deepl",
      position: pos,
      category: "general"
    }));
  }
  return results;
}

// src/search/engines/gitea.ts
var USER_AGENT102 = "opencode-search/1.0";
function makeGitea(config, baseUrl2 = "https://gitea.com") {
  return {
    name: config.name,
    config,
    search: (http, query, opts) => searchGitea(http, query, opts.numResults || config.maxResults, config.timeout, baseUrl2)
  };
}
function searchGitea(http, query, numResults, timeout3, baseUrl2) {
  return exports_Effect.gen(function* () {
    const params = new URLSearchParams({
      q: query,
      limit: String(Math.min(numResults, 50)),
      sort: "updated",
      order: "desc"
    });
    const response = yield* http.execute(exports_HttpClientRequest.get(`${baseUrl2}/api/v1/repos/search?${params.toString()}`).pipe(exports_HttpClientRequest.setHeaders({
      "User-Agent": USER_AGENT102,
      Accept: "application/json"
    }))).pipe(exports_Effect.timeout(timeout3));
    if (response.status < 200 || response.status >= 400)
      return [];
    const raw2 = yield* response.text;
    if (!raw2)
      return [];
    return parseGiteaResults(raw2, numResults, baseUrl2);
  });
}
function parseGiteaResults(raw2, maxResults, baseUrl2) {
  let parsed;
  try {
    parsed = JSON.parse(raw2);
  } catch {
    return [];
  }
  const data = parsed;
  const items = data?.data;
  if (!Array.isArray(items))
    return [];
  const results = [];
  let pos = 0;
  for (const item of items) {
    if (results.length >= maxResults)
      break;
    const name = item.full_name || item.name || "";
    const url = item.html_url || `${baseUrl2}/${item.full_name || item.name || ""}`;
    if (!name)
      continue;
    const parts2 = [];
    if (item.language)
      parts2.push(item.language);
    if (item.stars_count)
      parts2.push(`★${item.stars_count}`);
    if (item.forks_count)
      parts2.push(`⑂${item.forks_count}`);
    if (item.topics?.length)
      parts2.push(item.topics.slice(0, 3).join(", "));
    const repoName = item.full_name || item.name || "";
    pos++;
    results.push(makeSearchResult({
      title: `${item.stars_count ? `★${item.stars_count} ` : ""}${repoName}`,
      url,
      snippet: parts2.length > 0 ? `[${parts2.join(" · ")}] ${item.description || ""}`.trim() : item.description || `Gitea repository: ${repoName}`,
      engine: "gitea",
      position: pos,
      publishedDate: item.updated_at ? new Date(item.updated_at).getTime() : undefined,
      category: "code"
    }));
  }
  return results;
}

// src/search/engines/sourcehut.ts
var BASE_URL38 = "https://sr.ht/projects";
var USER_AGENT103 = "opencode-search/1.0 (bot; +https://opencode.ai)";
function makeSourceHut(config) {
  return {
    name: config.name,
    config,
    search: (http, query, opts) => searchSourceHut(http, query, opts.numResults || config.maxResults, config.timeout)
  };
}
function searchSourceHut(http, query, numResults, timeout3) {
  return exports_Effect.gen(function* () {
    const params = new URLSearchParams({
      search: query,
      sort: "recently-updated"
    });
    const response = yield* http.execute(exports_HttpClientRequest.get(`${BASE_URL38}?${params.toString()}`).pipe(exports_HttpClientRequest.setHeaders({
      "User-Agent": USER_AGENT103,
      Accept: "text/html"
    }))).pipe(exports_Effect.timeout(timeout3));
    if (response.status < 200 || response.status >= 400)
      return [];
    const html = yield* response.text;
    if (!html)
      return [];
    return parseSourceHutResults(html, numResults);
  });
}
function parseSourceHutResults(html, maxResults) {
  const results = [];
  let pos = 0;
  const eventRegex = /<div[^>]*class="[^"]*event[^"]*"[^>]*>[\s\S]*?<h4[^>]*>([\s\S]*?)<\/h4>[\s\S]*?(?:<p[^>]*>([\s\S]*?)<\/p>)?[\s\S]*?<\/div>\s*<\/div>/gi;
  let match6;
  while ((match6 = eventRegex.exec(html)) !== null) {
    if (results.length >= maxResults)
      break;
    const headerHtml = match6[1];
    const userMatch = headerHtml.match(/<a[^>]*href="\/([^"]+)"[^>]*>[^<]*<\/a>\s*<a[^>]*href="\/(?:[^"]+)"[^>]*>([^<]+)<\/a>/);
    if (!userMatch)
      continue;
    const username = userMatch[1].replace(/^~/, "");
    const projectName = userMatch[2].trim();
    if (!projectName)
      continue;
    const url = `https://sr.ht/~${username}/${projectName}`;
    const description = match6[2] ? match6[2].replace(/<[^>]+>/g, "").trim() : "";
    const tags = [];
    const tagRegex = /<a[^>]*>#([^<]+)<\/a>/g;
    let tagMatch;
    while ((tagMatch = tagRegex.exec(match6[0])) !== null) {
      tags.push(tagMatch[1].trim());
    }
    pos++;
    results.push(makeSearchResult({
      title: `~${username}/${projectName}`,
      url,
      snippet: tags.length > 0 ? `[${tags.join(", ")}] ${description}` : description || `SourceHut project by ~${username}`,
      engine: "sourcehut",
      position: pos,
      category: "code"
    }));
  }
  if (results.length === 0) {
    const fallbackRegex = /<a[^>]*href="\/(~[^"]+)"[^>]*>([^<]+)<\/a>/gi;
    let fallbackMatch;
    while ((fallbackMatch = fallbackRegex.exec(html)) !== null) {
      if (results.length >= maxResults)
        break;
      const href = fallbackMatch[1].trim();
      const title = fallbackMatch[2].trim();
      if (!title || href === "~" || title === "sr.ht")
        continue;
      pos++;
      results.push(makeSearchResult({
        title: `${href} - ${title}`,
        url: `https://sr.ht/${href}`,
        snippet: `SourceHut project`,
        engine: "sourcehut",
        position: pos,
        category: "code"
      }));
    }
  }
  return results;
}

// src/search/engines/dictzone.ts
var BASE_URL39 = "https://dictzone.com";
var USER_AGENT104 = "opencode-search/1.0";
var LANG_MAP2 = {
  en: "english",
  de: "german",
  fr: "french",
  es: "spanish",
  it: "italian",
  pt: "portuguese",
  nl: "dutch",
  pl: "polish",
  ru: "russian",
  sv: "swedish",
  da: "danish",
  no: "norwegian",
  fi: "finnish",
  cs: "czech",
  hu: "hungarian",
  ro: "romanian",
  bg: "bulgarian",
  el: "greek",
  la: "latin"
};
function getLangName(code) {
  return LANG_MAP2[code.toLowerCase()] || code.toLowerCase();
}
function makeDictzone(config, fromLang = "english", toLang = "german") {
  return {
    name: config.name,
    config,
    search: (http, query, opts) => searchDictzone(http, query, opts.numResults || config.maxResults, config.timeout, fromLang, toLang, opts.lang)
  };
}
function searchDictzone(http, query, numResults, timeout3, fromLang, toLang, lang) {
  return exports_Effect.gen(function* () {
    const fl = lang ? getLangName(lang) : fromLang;
    const tl = toLang;
    const url = `${BASE_URL39}/${fl}-${tl}-dictionary/${encodeURIComponent(query)}`;
    const response = yield* http.execute(exports_HttpClientRequest.get(url).pipe(exports_HttpClientRequest.setHeaders({
      "User-Agent": USER_AGENT104,
      Accept: "text/html"
    }))).pipe(exports_Effect.timeout(timeout3));
    if (response.status < 200 || response.status >= 400)
      return [];
    const html = yield* response.text;
    if (!html)
      return [];
    return parseDictzoneResults(html, numResults, query, fl, tl);
  });
}
function parseDictzoneResults(html, maxResults, query, fromLang, toLang) {
  const results = [];
  let pos = 0;
  const rowRegex = /<tr[^>]*>[\s\S]*?<td[^>]*class="[^"]*e[^"]*"[^>]*>([\s\S]*?)<\/td>[\s\S]*?<td[^>]*class="[^"]*t[^"]*"[^>]*>([\s\S]*?)<\/td>[\s\S]*?<\/tr>/gi;
  let match6;
  while ((match6 = rowRegex.exec(html)) !== null) {
    if (results.length >= maxResults)
      break;
    const sourceText = match6[1].replace(/<[^>]+>/g, "").trim();
    const targetHtml = match6[2];
    if (!sourceText || !targetHtml)
      continue;
    const translations = [];
    const synMatch = targetHtml.match(/<p[^>]*>([\s\S]*?)<\/p>/gi);
    if (synMatch) {
      for (const p of synMatch) {
        const text2 = p.replace(/<[^>]+>/g, "").trim();
        if (text2)
          translations.push(text2);
      }
    }
    const snippet = translations.length > 0 ? `${sourceText} → ${translations.join("; ")}` : `${sourceText} → ${targetHtml.replace(/<[^>]+>/g, "").trim()}`;
    pos++;
    results.push(makeSearchResult({
      title: `${query} - ${fromLang} to ${toLang}`,
      url: `${BASE_URL39}/${fromLang}-${toLang}-dictionary/${encodeURIComponent(query)}`,
      snippet: snippet.slice(0, 300),
      engine: "dictzone",
      position: pos,
      category: "general"
    }));
  }
  return results;
}

// src/search/engines/duden.ts
var BASE_URL40 = "https://www.duden.de";
var USER_AGENT105 = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
function makeDuden(config) {
  return {
    name: config.name,
    config,
    search: (http, query, opts) => searchDuden(http, query, opts.numResults || config.maxResults, config.timeout)
  };
}
function searchDuden(http, query, numResults, timeout3) {
  return exports_Effect.gen(function* () {
    const url = `${BASE_URL40}/suchen/dudenonline/${encodeURIComponent(query)}`;
    const response = yield* http.execute(exports_HttpClientRequest.get(url).pipe(exports_HttpClientRequest.setHeaders({
      "User-Agent": USER_AGENT105,
      Accept: "text/html"
    }))).pipe(exports_Effect.timeout(timeout3));
    if (response.status < 200 || response.status >= 400)
      return [];
    if (response.status === 404)
      return [];
    const html = yield* response.text;
    if (!html)
      return [];
    return parseDudenResults(html, numResults);
  });
}
function parseDudenResults(html, maxResults) {
  const results = [];
  let pos = 0;
  const sectionRegex = /<section[^>]*>[\s\S]*?<h2[^>]*>[\s\S]*?<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<\/h2>[\s\S]*?(?:<p[^>]*>([\s\S]*?)<\/p>)?[\s\S]*?<\/section>/gi;
  let match6;
  while ((match6 = sectionRegex.exec(html)) !== null) {
    if (results.length >= maxResults)
      break;
    let href = match6[1].trim();
    const title = match6[2].replace(/<[^>]+>/g, "").trim();
    const content = match6[3] ? match6[3].replace(/<[^>]+>/g, "").trim() : "";
    if (!title || !href)
      continue;
    if (href.startsWith("/"))
      href = `${BASE_URL40}${href}`;
    else if (!href.startsWith("http"))
      href = `${BASE_URL40}/${href}`;
    pos++;
    results.push(makeSearchResult({
      title,
      url: href,
      snippet: content || `Duden dictionary: ${title}`,
      engine: "duden",
      position: pos,
      category: "general"
    }));
  }
  return results;
}

// src/search/engines/bitchute.ts
var API_URL34 = "https://api.bitchute.com/api/beta/search/videos";
var USER_AGENT106 = "opencode-search/1.0";
function makeBitchute(config) {
  return {
    name: config.name,
    config,
    search: (http, query, opts) => searchBitchute(http, query, opts.numResults || config.maxResults, config.timeout)
  };
}
function searchBitchute(http, query, numResults, timeout3) {
  return exports_Effect.gen(function* () {
    const body = JSON.stringify({
      offset: 0,
      limit: Math.min(numResults, 50),
      query,
      sensitivity_id: "normal",
      sort: "new"
    });
    const response = yield* http.execute(exports_HttpClientRequest.post(API_URL34).pipe(exports_HttpClientRequest.setHeaders({
      "User-Agent": USER_AGENT106,
      "Content-Type": "application/json"
    }), exports_HttpClientRequest.bodyText(body))).pipe(exports_Effect.timeout(timeout3));
    if (response.status < 200 || response.status >= 400)
      return [];
    const raw2 = yield* response.text;
    if (!raw2)
      return [];
    return parseBitchuteResults(raw2, numResults);
  });
}
function parseBitchuteResults(raw2, maxResults) {
  let parsed;
  try {
    parsed = JSON.parse(raw2);
  } catch {
    return [];
  }
  const data = parsed;
  const videos = data?.videos;
  if (!Array.isArray(videos))
    return [];
  const results = [];
  let pos = 0;
  for (const item of videos) {
    if (results.length >= maxResults)
      break;
    if (!item.video_id || !item.video_name)
      continue;
    const url = `https://www.bitchute.com/video/${item.video_id}`;
    const author = item.channel?.channel_name || "";
    const duration = item.duration || "";
    const parts2 = [];
    if (author)
      parts2.push(author);
    if (duration)
      parts2.push(duration);
    if (item.view_count)
      parts2.push(`${item.view_count} views`);
    pos++;
    results.push(makeSearchResult({
      title: item.video_name,
      url,
      snippet: parts2.length > 0 ? `[${parts2.join(" · ")}] ${item.description || ""}`.trim() : item.description || "BitChute video",
      engine: "bitchute",
      position: pos,
      publishedDate: item.date_published ? new Date(item.date_published).getTime() : undefined,
      category: "video"
    }));
  }
  return results;
}

// src/search/engines/acfun.ts
var BASE_URL41 = "https://www.acfun.cn";
var USER_AGENT107 = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
function makeAcfun(config) {
  return {
    name: config.name,
    config,
    search: (http, query, opts) => searchAcfun(http, query, opts.numResults || config.maxResults, config.timeout)
  };
}
function searchAcfun(http, query, numResults, timeout3) {
  return exports_Effect.gen(function* () {
    const params = new URLSearchParams({
      keyword: query,
      pCursor: "1"
    });
    const response = yield* http.execute(exports_HttpClientRequest.get(`${BASE_URL41}/search?${params.toString()}`).pipe(exports_HttpClientRequest.setHeaders({
      "User-Agent": USER_AGENT107,
      Accept: "text/html"
    }))).pipe(exports_Effect.timeout(timeout3));
    if (response.status < 200 || response.status >= 400)
      return [];
    const html = yield* response.text;
    if (!html)
      return [];
    return parseAcfunResults(html, numResults);
  });
}
function parseAcfunResults(html, maxResults) {
  const results = [];
  let pos = 0;
  const pipeRegex = /bigPipe\.onPageletArrive\((\{[\s\S]*?\})\);/gi;
  let pipeMatch;
  while ((pipeMatch = pipeRegex.exec(html)) !== null) {
    if (results.length >= maxResults)
      break;
    let parsed;
    try {
      parsed = JSON.parse(pipeMatch[1]);
    } catch {
      continue;
    }
    const pagelet = parsed;
    const rawHtml = pagelet?.html;
    if (!rawHtml)
      continue;
    const videoRegex = /<div[^>]*class="[^"]*search-video[^"]*"[^>]*data-exposure-log='([^']+)'[^>]*>([\s\S]*?)<\/div>\s*<\/div>/gi;
    let videoMatch;
    while ((videoMatch = videoRegex.exec(rawHtml)) !== null) {
      if (results.length >= maxResults)
        break;
      let exposureData;
      try {
        exposureData = JSON.parse(videoMatch[1]);
      } catch {
        continue;
      }
      const data = exposureData;
      if (!data.content_id || !data.title)
        continue;
      const contentId = data.content_id;
      const title = data.title;
      const url = `${BASE_URL41}/v/ac${contentId}`;
      const blockHtml = videoMatch[2];
      const thumbMatch = blockHtml.match(/<img[^>]*src="([^"]*)"[^>]*>/);
      const durationMatch = blockHtml.match(/duration[^>]*>([^<]+)</);
      const introMatch = blockHtml.match(/intro[^>]*>([^<]+)</);
      const timeMatch = blockHtml.match(/create-time[^>]*>([^<]+)</);
      const thumbnail = thumbMatch?.[1] || "";
      const duration = durationMatch?.[1]?.trim() || "";
      const description = introMatch?.[1]?.trim() || "";
      const createTime = timeMatch?.[1]?.trim() || "";
      pos++;
      results.push(makeSearchResult({
        title,
        url,
        snippet: [duration, createTime, description].filter(Boolean).join(" · ") || "AcFun video",
        engine: "acfun",
        position: pos,
        publishedDate: createTime ? new Date(createTime).getTime() : undefined,
        category: "video"
      }));
    }
  }
  return results;
}

// src/search/engines/sogou-videos.ts
var BASE_URL42 = "https://v.sogou.com";
var USER_AGENT108 = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
function makeSogouVideos(config) {
  return {
    name: config.name,
    config,
    search: (http, query, opts) => searchSogouVideos(http, query, opts.numResults || config.maxResults, config.timeout)
  };
}
function searchSogouVideos(http, query, numResults, timeout3) {
  return exports_Effect.gen(function* () {
    const params = new URLSearchParams({
      page: "1",
      pagesize: String(Math.min(numResults, 20)),
      query
    });
    const response = yield* http.execute(exports_HttpClientRequest.get(`${BASE_URL42}/api/video/shortVideoV2?${params.toString()}`).pipe(exports_HttpClientRequest.setHeaders({
      "User-Agent": USER_AGENT108,
      Accept: "application/json",
      Referer: `${BASE_URL42}/`
    }))).pipe(exports_Effect.timeout(timeout3));
    if (response.status < 200 || response.status >= 400)
      return [];
    const raw2 = yield* response.text;
    if (!raw2)
      return [];
    return parseSogouVideosResults(raw2, numResults);
  });
}
function parseSogouVideosResults(raw2, maxResults) {
  let parsed;
  try {
    parsed = JSON.parse(raw2);
  } catch {
    return [];
  }
  const data = parsed;
  const items = data?.data?.list;
  if (!Array.isArray(items))
    return [];
  const results = [];
  let pos = 0;
  for (const item of items) {
    if (results.length >= maxResults)
      break;
    if (!item.titleEsc || !item.url)
      continue;
    const videoUrl = item.url.startsWith("/") ? `${BASE_URL42}${item.url}` : item.url;
    const parts2 = [];
    if (item.site)
      parts2.push(item.site);
    if (item.duration)
      parts2.push(item.duration);
    if (item.date)
      parts2.push(item.date);
    pos++;
    results.push(makeSearchResult({
      title: item.titleEsc,
      url: videoUrl,
      snippet: parts2.length > 0 ? parts2.join(" · ") : "Sogou video",
      engine: "sogou-videos",
      position: pos,
      publishedDate: item.date ? new Date(item.date).getTime() : undefined,
      category: "video"
    }));
  }
  return results;
}

// src/search/engines/sogou-images.ts
var BASE_URL43 = "https://pic.sogou.com";
var USER_AGENT109 = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
function makeSogouImages(config) {
  return {
    name: config.name,
    config,
    search: (http, query, opts) => searchSogouImages(http, query, opts.numResults || config.maxResults, config.timeout)
  };
}
function searchSogouImages(http, query, numResults, timeout3) {
  return exports_Effect.gen(function* () {
    const params = new URLSearchParams({
      query,
      start: "0"
    });
    const response = yield* http.execute(exports_HttpClientRequest.get(`${BASE_URL43}/pics?${params.toString()}`).pipe(exports_HttpClientRequest.setHeaders({
      "User-Agent": USER_AGENT109,
      Accept: "text/html",
      Referer: `${BASE_URL43}/`
    }))).pipe(exports_Effect.timeout(timeout3));
    if (response.status < 200 || response.status >= 400)
      return [];
    const html = yield* response.text;
    if (!html)
      return [];
    return parseSogouImagesResults(html, numResults);
  });
}
function parseSogouImagesResults(html, maxResults) {
  const stateMatch = html.match(/window\.__INITIAL_STATE__\s*=\s*({.*?});/s);
  if (!stateMatch)
    return [];
  let parsed;
  try {
    parsed = JSON.parse(stateMatch[1]);
  } catch {
    return [];
  }
  const data = parsed;
  const items = data?.searchList?.searchList;
  if (!Array.isArray(items))
    return [];
  const results = [];
  let pos = 0;
  for (const item of items) {
    if (results.length >= maxResults)
      break;
    if (!item.url || !item.picUrl)
      continue;
    const source = item.ch_site_name || "";
    const description = item.content_major || "";
    pos++;
    results.push(makeSearchResult({
      title: item.title || `Image ${pos}`,
      url: item.url,
      snippet: [source, description].filter(Boolean).join(" · ") || "Sogou image",
      engine: "sogou-images",
      position: pos,
      category: "image"
    }));
  }
  return results;
}

// src/search/engines/zhihu.ts
var BASE_URL44 = "https://www.zhihu.com";
var USER_AGENT110 = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
function makeZhihu(config) {
  return {
    name: config.name,
    config,
    search: (http, query, opts) => searchZhihu(http, query, opts.numResults || config.maxResults, config.timeout)
  };
}
function searchZhihu(http, query, numResults, timeout3) {
  return exports_Effect.gen(function* () {
    const params = new URLSearchParams({
      q: query,
      type: "content"
    });
    const response = yield* http.execute(exports_HttpClientRequest.get(`${BASE_URL44}/search?${params.toString()}`).pipe(exports_HttpClientRequest.setHeaders({
      "User-Agent": USER_AGENT110,
      Accept: "text/html",
      "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
      Referer: `${BASE_URL44}/`
    }))).pipe(exports_Effect.timeout(timeout3));
    if (response.status < 200 || response.status >= 400)
      return [];
    const html = yield* response.text;
    if (!html)
      return [];
    return parseZhihuResults(html, numResults);
  });
}
function parseZhihuResults(html, maxResults) {
  const patterns = [
    {
      regex: /<a[^>]*class="[^"]*[Ee]ntry[^"]*"[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<p[^>]*class="[^"]*[Rr]ich[Cc]ontent[^"]*"[^>]*>([\s\S]*?)<\/p>/gi,
      extract(m) {
        const href = m[1].trim();
        const title = stripHtml(m[2]);
        const snippet = stripHtml(m[3] ?? "");
        if (!title || !href)
          return null;
        return { title, href: normalizeZhihuUrl(href), snippet: snippet || "知乎内容" };
      }
    },
    {
      regex: /<div[^>]*class="[^"]*[Ss]earch[_-][Rr]esult[_-][Ii]tem[^"]*"[^>]*>[\s\S]*?<a[^>]*href="([^"]*)"[^>]*>[\s\S]*?<span[^>]*class="[^"]*[Rr]ich[Ww]ord[^"]*"[^>]*>([\s\S]*?)<\/span>[\s\S]*?<\/a>/gi,
      extract(m) {
        const href = m[1].trim();
        const title = stripHtml(m[2]);
        if (!title || !href)
          return null;
        return { title, href: normalizeZhihuUrl(href), snippet: "知乎回答" };
      }
    },
    {
      regex: /<a[^>]*href="(\/question\/[^"]*|\/answer\/[^"]*|\/people\/[^"]*|\/p\/[^"]*)"[^>]*>([\s\S]*?)<\/a>/gi,
      extract(m) {
        const href = m[1].trim();
        const title = stripHtml(m[2]);
        if (!title)
          return null;
        return { title, href: `${BASE_URL44}${href}`, snippet: "知乎内容" };
      }
    }
  ];
  for (const { regex, extract } of patterns) {
    const results = tryParsePattern(html, maxResults, regex, extract);
    if (results.length > 0)
      return results;
  }
  return [];
}
function tryParsePattern(html, maxResults, pattern, extract) {
  const results = [];
  let match6;
  while ((match6 = pattern.exec(html)) !== null) {
    if (results.length >= maxResults)
      break;
    const parsed = extract(match6);
    if (!parsed)
      continue;
    results.push(makeZhihuResult(parsed.title, parsed.href, parsed.snippet, results.length + 1));
  }
  return results;
}
function normalizeZhihuUrl(href) {
  if (href.startsWith("/"))
    return `${BASE_URL44}${href}`;
  if (!href.startsWith("http"))
    return `${BASE_URL44}/${href}`;
  return href;
}
function makeZhihuResult(title, url, snippet, position) {
  return makeSearchResult({
    title,
    url,
    snippet,
    engine: "zhihu",
    position,
    category: "social"
  });
}

// src/search/engines/xiaohongshu.ts
var BASE_URL45 = "https://www.xiaohongshu.com";
var USER_AGENT111 = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
function makeXiaohongshu(config) {
  return {
    name: config.name,
    config,
    search: (http, query, opts) => searchXiaohongshu(http, query, opts.numResults || config.maxResults, config.timeout)
  };
}
function searchXiaohongshu(http, query, numResults, timeout3) {
  return exports_Effect.gen(function* () {
    const url = `${BASE_URL45}/search_result?keyword=${encodeURIComponent(query)}&source=web_search_result_notes`;
    const response = yield* http.execute(exports_HttpClientRequest.get(url).pipe(exports_HttpClientRequest.setHeaders({
      "User-Agent": USER_AGENT111,
      Accept: "text/html",
      "Accept-Language": "zh-CN,zh;q=0.9",
      Referer: `${BASE_URL45}/explore`
    }))).pipe(exports_Effect.timeout(timeout3));
    if (response.status < 200 || response.status >= 400)
      return [];
    const html = yield* response.text;
    if (!html)
      return [];
    return parseXiaohongshuResults(html, numResults);
  });
}
function parseXiaohongshuResults(html, maxResults) {
  const results = [];
  let pos = 0;
  const pattern1 = /<a[^>]*class="[^"]*[Nn]ote[Ii]tem[^"]*"[^>]*href="([^"]*)"[^>]*>[\s\S]*?<img[^>]*alt="([^"]*)"[^>]*src="([^"]*)"[^>]*>[\s\S]*?(?:<span[^>]*class="[^"]*[Ll]ikes?[^"]*"[^>]*>([^<]*)<)?[\s\S]*?<\/a>/gi;
  let match6;
  while ((match6 = pattern1.exec(html)) !== null) {
    if (results.length >= maxResults)
      break;
    let href = match6[1].trim();
    const title = match6[2].trim();
    const likes = match6[4]?.trim() || "";
    if (!title || !href)
      continue;
    if (href.startsWith("/"))
      href = `${BASE_URL45}${href}`;
    else if (!href.startsWith("http"))
      href = `${BASE_URL45}/${href}`;
    pos++;
    results.push(makeSearchResult({
      title,
      url: href,
      snippet: likes ? `❤️ ${likes}` : "小红书笔记",
      engine: "xiaohongshu",
      position: pos,
      category: "social"
    }));
  }
  const pattern2 = /<a[^>]*href="(\/explore\/[^"]*|\/discovery\/[^"]*|\/search_result\/[^"]*)"[^>]*>([\s\S]*?)<\/a>/gi;
  if (results.length === 0) {
    while ((match6 = pattern2.exec(html)) !== null) {
      if (results.length >= maxResults)
        break;
      let href = match6[1].trim();
      const title = match6[2].replace(/<[^>]+>/g, "").trim();
      if (!title)
        continue;
      if (href.startsWith("/"))
        href = `${BASE_URL45}${href}`;
      pos++;
      results.push(makeSearchResult({
        title,
        url: href,
        snippet: "小红书内容",
        engine: "xiaohongshu",
        position: pos,
        category: "social"
      }));
    }
  }
  return results;
}

// src/search/engines/emojipedia.ts
var BASE_URL46 = "https://emojipedia.org";
var USER_AGENT112 = "opencode-search/1.0";
function makeEmojipedia(config) {
  return {
    name: config.name,
    config,
    search: (http, query, opts) => searchEmojipedia(http, query, opts.numResults || config.maxResults, config.timeout)
  };
}
function searchEmojipedia(http, query, numResults, timeout3) {
  return exports_Effect.gen(function* () {
    const params = new URLSearchParams({ q: query });
    const response = yield* http.execute(exports_HttpClientRequest.get(`${BASE_URL46}/search?${params.toString()}`).pipe(exports_HttpClientRequest.setHeaders({
      "User-Agent": USER_AGENT112,
      Accept: "text/html"
    }))).pipe(exports_Effect.timeout(timeout3));
    if (response.status < 200 || response.status >= 400)
      return [];
    const html = yield* response.text;
    if (!html)
      return [];
    return parseEmojipediaResults(html, numResults);
  });
}
function parseEmojipediaResults(html, maxResults) {
  const results = [];
  let pos = 0;
  const itemRegex = /<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi;
  const containerRegex = /<div[^>]*class="[^"]*EmojisList[^"]*"[^>]*>([\s\S]*?)<\/div>/i;
  const containerMatch = html.match(containerRegex);
  const searchHtml = containerMatch ? containerMatch[1] : html;
  let match6;
  while ((match6 = itemRegex.exec(searchHtml)) !== null) {
    if (results.length >= maxResults)
      break;
    let href = match6[1].trim();
    const title = match6[2].replace(/<[^>]+>/g, "").trim();
    if (!title || !href || href === "#")
      continue;
    if (href.startsWith("/"))
      href = `${BASE_URL46}${href}`;
    else if (!href.startsWith("http"))
      href = `${BASE_URL46}/${href}`;
    pos++;
    results.push(makeSearchResult({
      title,
      url: href,
      snippet: `Emoji: ${title}`,
      engine: "emojipedia",
      position: pos,
      category: "general"
    }));
  }
  return results;
}

// src/search/engines/cara.ts
var BASE_URL47 = "https://cara.app";
var USER_AGENT113 = "opencode-search/1.0";
function makeCara(config) {
  return {
    name: config.name,
    config,
    search: (http, query, opts) => searchCara(http, query, opts.numResults || config.maxResults, config.timeout)
  };
}
function searchCara(http, query, numResults, timeout3) {
  return exports_Effect.gen(function* () {
    const params = new URLSearchParams({
      q: query,
      sortBy: "Top",
      take: String(Math.min(numResults, 24)),
      skip: "0"
    });
    const response = yield* http.execute(exports_HttpClientRequest.get(`${BASE_URL47}/api/search/portfolio-posts?${params.toString()}`).pipe(exports_HttpClientRequest.setHeaders({
      "User-Agent": USER_AGENT113,
      Accept: "application/json"
    }))).pipe(exports_Effect.timeout(timeout3));
    if (response.status < 200 || response.status >= 400)
      return [];
    const raw2 = yield* response.text;
    if (!raw2)
      return [];
    return parseCaraResults(raw2, numResults);
  });
}
function parseCaraResults(raw2, maxResults) {
  let parsed;
  try {
    parsed = JSON.parse(raw2);
  } catch {
    return [];
  }
  const items = parsed;
  if (!Array.isArray(items))
    return [];
  const results = [];
  let pos = 0;
  for (const item of items) {
    if (results.length >= maxResults)
      break;
    if (!item.id)
      continue;
    let thumbnail;
    let img;
    if (item.images) {
      for (const i of item.images) {
        if (!thumbnail || i.isCoverImg)
          thumbnail = i;
        if (!img || !i.isCoverImg)
          img = i;
      }
    }
    const author = item.name || "";
    const title = item.title || "Untitled";
    const description = item.content || "";
    const parts2 = [];
    if (author)
      parts2.push(`by ${author}`);
    if (img?.src)
      parts2.push("has image");
    pos++;
    results.push(makeSearchResult({
      title,
      url: `${BASE_URL47}/post/${item.id}`,
      snippet: parts2.length > 0 ? `[${parts2.join(" · ")}] ${description}`.trim() : description || "Cara art post",
      engine: "cara",
      position: pos,
      category: "image"
    }));
  }
  return results;
}

// src/search/engines/openclipart.ts
var BASE_URL48 = "https://openclipart.org";
var USER_AGENT114 = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
function makeOpenClipArt(config) {
  return {
    name: config.name,
    config,
    search: (http, query, opts) => searchOpenClipArt(http, query, opts.numResults || config.maxResults, config.timeout)
  };
}
function searchOpenClipArt(http, query, numResults, timeout3) {
  return exports_Effect.gen(function* () {
    const params = new URLSearchParams({
      query,
      p: "1"
    });
    const response = yield* http.execute(exports_HttpClientRequest.get(`${BASE_URL48}/search/?${params.toString()}`).pipe(exports_HttpClientRequest.setHeaders({
      "User-Agent": USER_AGENT114,
      Accept: "text/html"
    }))).pipe(exports_Effect.timeout(timeout3));
    if (response.status < 200 || response.status >= 400)
      return [];
    const html = yield* response.text;
    if (!html)
      return [];
    return parseOpenClipArtResults(html, numResults);
  });
}
function parseOpenClipArtResults(html, maxResults) {
  const results = [];
  let pos = 0;
  const itemRegex = /<div[^>]*class="[^"]*artwork[^"]*"[^>]*>[\s\S]*?<a[^>]*href="([^"]*)"[^>]*>[\s\S]*?<img[^>]*src="([^"]*)"[^>]*alt="([^"]*)"[^>]*>/gi;
  let match6;
  while ((match6 = itemRegex.exec(html)) !== null) {
    if (results.length >= maxResults)
      break;
    let href = match6[1].trim();
    const imgSrc = match6[2].trim();
    const alt = match6[3].trim();
    if (!href || !alt)
      continue;
    if (href.startsWith("/"))
      href = `${BASE_URL48}${href}`;
    else if (!href.startsWith("http"))
      href = `${BASE_URL48}/${href}`;
    pos++;
    results.push(makeSearchResult({
      title: alt,
      url: href,
      snippet: `OpenClipArt: ${alt}`,
      engine: "openclipart",
      position: pos,
      category: "image"
    }));
  }
  return results;
}

// src/search/engines/ipernity.ts
var BASE_URL49 = "https://www.ipernity.com";
var USER_AGENT115 = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
function makeIpernity(config) {
  return {
    name: config.name,
    config,
    search: (http, query, opts) => searchIpernity(http, query, opts.numResults || config.maxResults, config.timeout)
  };
}
function searchIpernity(http, query, numResults, timeout3) {
  return exports_Effect.gen(function* () {
    const url = `${BASE_URL49}/search/photo/@/page:1:10?q=${encodeURIComponent(query)}`;
    const response = yield* http.execute(exports_HttpClientRequest.get(url).pipe(exports_HttpClientRequest.setHeaders({
      "User-Agent": USER_AGENT115,
      Accept: "text/html"
    }))).pipe(exports_Effect.timeout(timeout3));
    if (response.status < 200 || response.status >= 400)
      return [];
    const html = yield* response.text;
    if (!html)
      return [];
    return parseIpernityResults(html, numResults);
  });
}
function parseIpernityResults(html, maxResults) {
  const results = [];
  let pos = 0;
  const imgRegex = /<a[^>]*href="(\/doc\/[^"]+)"[^>]*>[\s\S]*?<img[^>]*src="([^"]*)"[^>]*>/gi;
  const jsRegex = /searchResults\[\s*\d+\s*\]\s*=\s*({[\s\S]*?});/g;
  const imgEntries = [];
  let imgMatch;
  while ((imgMatch = imgRegex.exec(html)) !== null) {
    imgEntries.push({
      href: imgMatch[1].trim(),
      thumbUrl: imgMatch[2].trim()
    });
  }
  const jsEntries = [];
  let jsMatch;
  while ((jsMatch = jsRegex.exec(html)) !== null) {
    try {
      const data = JSON.parse(jsMatch[1]);
      jsEntries.push(data);
    } catch {}
  }
  const maxLen = Math.min(imgEntries.length, Math.max(jsEntries.length || imgEntries.length, maxResults));
  for (let i = 0;i < maxLen; i++) {
    if (results.length >= maxResults)
      break;
    const img = imgEntries[i];
    const info = jsEntries[i] || {};
    if (!img?.href)
      continue;
    const title = info?.title || "Ipernity photo";
    const docUrl = `${BASE_URL49}${img.href}`;
    const imgUrl = img.thumbUrl.replace("240.jpg", "640.jpg");
    const author = info?.user_name || "";
    pos++;
    results.push(makeSearchResult({
      title,
      url: docUrl,
      snippet: author ? `by ${author}` : "Ipernity photo",
      engine: "ipernity",
      position: pos,
      publishedDate: info?.posted_at ? new Date(info.posted_at * 1000).getTime() : undefined,
      category: "image"
    }));
  }
  return results;
}

// src/search/engines/uxwing.ts
var BASE_URL50 = "https://uxwing.com";
var USER_AGENT116 = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
function makeUxwing(config) {
  return {
    name: config.name,
    config,
    search: (http, query, opts) => searchUxwing(http, query, opts.numResults || config.maxResults, config.timeout)
  };
}
function searchUxwing(http, query, numResults, timeout3) {
  return exports_Effect.gen(function* () {
    const url = `${BASE_URL50}/?s=${encodeURIComponent(query)}`;
    const response = yield* http.execute(exports_HttpClientRequest.get(url).pipe(exports_HttpClientRequest.setHeaders({
      "User-Agent": USER_AGENT116,
      Accept: "text/html"
    }))).pipe(exports_Effect.timeout(timeout3));
    if (response.status < 200 || response.status >= 400)
      return [];
    const html = yield* response.text;
    if (!html)
      return [];
    return parseUxwingResults(html, numResults);
  });
}
function parseUxwingResults(html, maxResults) {
  const results = [];
  let pos = 0;
  const itemRegex = /<article[^>]*id="[^"]*post[^"]*"[^>]*class="([^"]*)"[^>]*>[\s\S]*?<a[^>]*href="([^"]*)"[^>]*>[\s\S]*?<img[^>]*src="([^"]*)"[^>]*alt="([^"]*)"[^>]*>[\s\S]*?<\/article>/gi;
  let match6;
  while ((match6 = itemRegex.exec(html)) !== null) {
    if (results.length >= maxResults)
      break;
    const classes = match6[1];
    const href = match6[2].trim();
    const imgSrc = match6[3].trim();
    const alt = match6[4].trim();
    if (!alt || !href)
      continue;
    const tags = [];
    for (const cls of classes.split(/\s+/)) {
      const catMatch = cls.match(/^(?:category|tag)(.+)/);
      if (catMatch) {
        tags.push(catMatch[1].replace(/-/g, " "));
      }
    }
    pos++;
    results.push(makeSearchResult({
      title: alt,
      url: href.startsWith("http") ? href : `${BASE_URL50}${href}`,
      snippet: tags.length > 0 ? `Icon: ${tags.join(", ")}` : "UXWing icon",
      engine: "uxwing",
      position: pos,
      category: "image"
    }));
  }
  return results;
}

// src/search/engines/flaticon.ts
var BASE_URL51 = "https://www.flaticon.com";
var USER_AGENT117 = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
function makeFlaticon(config) {
  return {
    name: config.name,
    config,
    search: (http, query, opts) => searchFlaticon(http, query, opts.numResults || config.maxResults, config.timeout)
  };
}
function searchFlaticon(http, query, numResults, timeout3) {
  return exports_Effect.gen(function* () {
    const params = new URLSearchParams({ word: query });
    const response = yield* http.execute(exports_HttpClientRequest.get(`${BASE_URL51}/search?${params.toString()}`).pipe(exports_HttpClientRequest.setHeaders({
      "User-Agent": USER_AGENT117,
      Accept: "text/html"
    }))).pipe(exports_Effect.timeout(timeout3));
    if (response.status < 200 || response.status >= 400)
      return [];
    const html = yield* response.text;
    if (!html)
      return [];
    return parseFlaticonResults(html, numResults);
  });
}
function parseFlaticonResults(html, maxResults) {
  const results = [];
  let pos = 0;
  const itemRegex = /<a[^>]*class="[^"]*icon--[^"]*"[^>]*href="([^"]*)"[^>]*>[\s\S]*?<img[^>]*src="([^"]*)"[^>]*alt="([^"]*)"[^>]*>/gi;
  const fallbackRegex = /<img[^>]*src="[^"]*flaticon[^"]*"[^>]*alt="([^"]*)"[^>]*>[\s\S]*?<a[^>]*href="(\/[^"]*)"[^>]*>/gi;
  let match6;
  while ((match6 = itemRegex.exec(html)) !== null) {
    if (results.length >= maxResults)
      break;
    let href = match6[1].trim();
    const alt = match6[3].trim();
    if (!alt)
      continue;
    if (href.startsWith("/"))
      href = `${BASE_URL51}${href}`;
    else if (!href.startsWith("http"))
      href = `${BASE_URL51}/${href}`;
    pos++;
    results.push(makeSearchResult({
      title: alt,
      url: href,
      snippet: `Flaticon icon: ${alt}`,
      engine: "flaticon",
      position: pos,
      category: "image"
    }));
  }
  if (results.length === 0) {
    let fMatch;
    while ((fMatch = fallbackRegex.exec(html)) !== null) {
      if (results.length >= maxResults)
        break;
      const fAlt = fMatch[1].trim();
      if (!fAlt)
        continue;
      const fHref = fMatch[2].startsWith("http") ? fMatch[2] : `${BASE_URL51}${fMatch[2]}`;
      pos++;
      results.push(makeSearchResult({
        title: fAlt,
        url: fHref,
        snippet: `Flaticon icon`,
        engine: "flaticon",
        position: pos,
        category: "image"
      }));
    }
  }
  return results;
}

// src/search/engines/tagesschau.ts
var BASE_URL52 = "https://www.tagesschau.de";
var USER_AGENT118 = "opencode-search/1.0";
function makeTagesschau(config) {
  return {
    name: config.name,
    config,
    search: (http, query, opts) => searchTagesschau(http, query, opts.numResults || config.maxResults, config.timeout)
  };
}
function searchTagesschau(http, query, numResults, timeout3) {
  return exports_Effect.gen(function* () {
    const params = new URLSearchParams({
      searchText: query,
      pageSize: String(Math.min(numResults, 10)),
      resultPage: "0"
    });
    const response = yield* http.execute(exports_HttpClientRequest.get(`${BASE_URL52}/api2u/search?${params.toString()}`).pipe(exports_HttpClientRequest.setHeaders({
      "User-Agent": USER_AGENT118,
      Accept: "application/json"
    }))).pipe(exports_Effect.timeout(timeout3));
    if (response.status < 200 || response.status >= 400)
      return [];
    const raw2 = yield* response.text;
    if (!raw2)
      return [];
    return parseTagesschauResults(raw2, numResults);
  });
}
function parseTagesschauResults(raw2, maxResults) {
  let parsed;
  try {
    parsed = JSON.parse(raw2);
  } catch {
    return [];
  }
  const data = parsed;
  const items = data?.searchResults;
  if (!Array.isArray(items))
    return [];
  const results = [];
  let pos = 0;
  for (const item of items) {
    if (results.length >= maxResults)
      break;
    if (!item.title)
      continue;
    const itemType = item.type || "story";
    const url = item.shareURL || item.detailsweb || `${BASE_URL52}/`;
    const publishedDate = item.date ? new Date(item.date).getTime() : undefined;
    pos++;
    results.push(makeSearchResult({
      title: item.title,
      url,
      snippet: `[${itemType === "video" ? "VIDEO" : "NEWS"}] ${item.firstSentence || ""}`.trim(),
      engine: "tagesschau",
      position: pos,
      publishedDate,
      category: "news"
    }));
  }
  return results;
}

// src/search/engines/selfhst.ts
var CDN_URL = "https://cdn.jsdelivr.net/gh/selfhst/icons";
var USER_AGENT119 = "opencode-search/1.0";
function makeSelfhst(config) {
  return {
    name: config.name,
    config,
    search: (http, query, opts) => searchSelfhst(http, query, opts.numResults || config.maxResults, config.timeout)
  };
}
function searchSelfhst(http, query, numResults, timeout3) {
  return exports_Effect.gen(function* () {
    const response = yield* http.execute(exports_HttpClientRequest.get(`${CDN_URL}/index.json`).pipe(exports_HttpClientRequest.setHeaders({
      "User-Agent": USER_AGENT119,
      Accept: "application/json"
    }))).pipe(exports_Effect.timeout(timeout3));
    if (response.status < 200 || response.status >= 400)
      return [];
    const raw2 = yield* response.text;
    if (!raw2)
      return [];
    return parseSelfhstResults(raw2, query, numResults);
  });
}
function parseSelfhstResults(raw2, query, maxResults) {
  let parsed;
  try {
    parsed = JSON.parse(raw2);
  } catch {
    return [];
  }
  const items = parsed;
  if (!Array.isArray(items))
    return [];
  const queryParts = query.toLowerCase().split(/\s+/);
  const results = [];
  let pos = 0;
  for (const item of items) {
    if (results.length >= maxResults)
      break;
    const keyword = (item.Reference || "").toLowerCase();
    if (!queryParts.some((part) => keyword.includes(part)))
      continue;
    const imgFormat = item.SVG === "Yes" ? "svg" : item.PNG === "Yes" ? "png" : item.WebP === "Yes" ? "webp" : null;
    if (!imgFormat || !item.Reference)
      continue;
    const imgSrc = `${CDN_URL}/${imgFormat.toUpperCase()}/${item.Reference}.${imgFormat}`;
    pos++;
    results.push(makeSearchResult({
      title: item.Name || item.Reference,
      url: imgSrc,
      snippet: `Selfhst icon · ${imgFormat.toUpperCase()}`,
      engine: "selfhst",
      position: pos,
      publishedDate: item.CreatedAt ? new Date(item.CreatedAt).getTime() : undefined,
      category: "image"
    }));
  }
  return results;
}

// src/search/engines/devicons.ts
var CDN_URL2 = "https://cdn.jsdelivr.net/gh/devicons/devicon@latest";
var USER_AGENT120 = "opencode-search/1.0";
function makeDevicons(config) {
  return {
    name: config.name,
    config,
    search: (http, query, opts) => searchDevicons(http, query, opts.numResults || config.maxResults, config.timeout)
  };
}
function searchDevicons(http, query, numResults, timeout3) {
  return exports_Effect.gen(function* () {
    const response = yield* http.execute(exports_HttpClientRequest.get(`${CDN_URL2}/devicon.json`).pipe(exports_HttpClientRequest.setHeaders({
      "User-Agent": USER_AGENT120,
      Accept: "application/json"
    }))).pipe(exports_Effect.timeout(timeout3));
    if (response.status < 200 || response.status >= 400)
      return [];
    const raw2 = yield* response.text;
    if (!raw2)
      return [];
    return parseDeviconsResults(raw2, query, numResults);
  });
}
function parseDeviconsResults(raw2, query, maxResults) {
  let parsed;
  try {
    parsed = JSON.parse(raw2);
  } catch {
    return [];
  }
  const items = parsed;
  if (!Array.isArray(items))
    return [];
  const queryParts = query.toLowerCase().split(/\s+/);
  const results = [];
  let pos = 0;
  for (const item of items) {
    if (!item.name)
      continue;
    const name = item.name.toLowerCase();
    const altnames = (item.altnames || []).map((a) => a.toLowerCase());
    const tags = (item.tags || []).map((t) => t.toLowerCase());
    const match6 = queryParts.some((part) => name.includes(part) || altnames.some((a) => a.includes(part)) || tags.some((t) => t.includes(part)));
    if (!match6)
      continue;
    const svgVersions = item.versions?.svg || [];
    for (const version2 of svgVersions) {
      if (results.length >= maxResults)
        break;
      const imgSrc = `${CDN_URL2}/icons/${item.name}/${item.name}-${version2}.svg`;
      pos++;
      results.push(makeSearchResult({
        title: item.name,
        url: imgSrc,
        snippet: `Devicon · ${item.color || ""}`.trim(),
        engine: "devicons",
        position: pos,
        category: "image"
      }));
    }
    if (results.length >= maxResults)
      break;
  }
  return results;
}

// src/search/engines/lucide.ts
var CDN_URL3 = "https://cdn.jsdelivr.net/npm/lucide-static";
var USER_AGENT121 = "opencode-search/1.0";
function makeLucide(config) {
  return {
    name: config.name,
    config,
    search: (http, query, opts) => searchLucide(http, query, opts.numResults || config.maxResults, config.timeout)
  };
}
function searchLucide(http, query, numResults, timeout3) {
  return exports_Effect.gen(function* () {
    const response = yield* http.execute(exports_HttpClientRequest.get(`${CDN_URL3}/tags.json`).pipe(exports_HttpClientRequest.setHeaders({
      "User-Agent": USER_AGENT121,
      Accept: "application/json"
    }))).pipe(exports_Effect.timeout(timeout3));
    if (response.status < 200 || response.status >= 400)
      return [];
    const raw2 = yield* response.text;
    if (!raw2)
      return [];
    return parseLucideResults(raw2, query, numResults);
  });
}
function parseLucideResults(raw2, query, maxResults) {
  let parsed;
  try {
    parsed = JSON.parse(raw2);
  } catch {
    return [];
  }
  const data = parsed;
  const queryParts = query.toLowerCase().split(/\s+/);
  const results = [];
  let pos = 0;
  for (const [iconName, tags] of Object.entries(data)) {
    if (results.length >= maxResults)
      break;
    const match6 = queryParts.some((part) => iconName.includes(part) || tags.some((t) => t.includes(part)));
    if (!match6)
      continue;
    const imgSrc = `${CDN_URL3}/icons/${iconName}.svg`;
    pos++;
    results.push(makeSearchResult({
      title: iconName,
      url: imgSrc,
      snippet: `Lucide icon · ${tags.slice(0, 3).join(", ")}`,
      engine: "lucide",
      position: pos,
      category: "image"
    }));
  }
  return results;
}

// src/search/engines/material-icons.ts
var SEARCH_URL19 = "https://fonts.google.com/metadata/icons?key=material_symbols&incomplete=true";
var IMG_URL = "https://fonts.gstatic.com/s/i/short-term/release/materialsymbolsoutlined";
var USER_AGENT122 = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36";
function makeMaterialIcons(config) {
  return {
    name: config.name,
    config,
    search: (http, query, opts) => searchMaterialIcons(http, query, opts.numResults || config.maxResults, config.timeout)
  };
}
function searchMaterialIcons(http, query, numResults, timeout3) {
  return exports_Effect.gen(function* () {
    const response = yield* http.execute(exports_HttpClientRequest.get(SEARCH_URL19).pipe(exports_HttpClientRequest.setHeaders({
      "User-Agent": USER_AGENT122,
      Accept: "application/json",
      Referer: "https://fonts.google.com/"
    }))).pipe(exports_Effect.timeout(timeout3));
    if (response.status < 200 || response.status >= 400)
      return [];
    const raw2 = yield* response.text;
    if (!raw2)
      return [];
    return parseMaterialIconsResults(raw2, query, numResults);
  });
}
function parseMaterialIconsResults(raw2, query, maxResults) {
  const jsonStart = raw2.indexOf("{");
  if (jsonStart === -1)
    return [];
  let parsed;
  try {
    parsed = JSON.parse(raw2.slice(jsonStart));
  } catch {
    return [];
  }
  const data = parsed;
  const icons = data?.icons;
  if (!Array.isArray(icons))
    return [];
  const queryParts = query.toLowerCase().split(/\s+/);
  const results = [];
  let pos = 0;
  for (const icon of icons) {
    if (results.length >= maxResults)
      break;
    if (!icon.name)
      continue;
    const name = icon.name.toLowerCase();
    const tags = (icon.tags || []).map((t) => t.toLowerCase());
    const categories = (icon.categories || []).map((c) => c.toLowerCase());
    const match6 = queryParts.some((part) => name.includes(part) || tags.some((t) => t.includes(part)) || categories.some((c) => c.includes(part)));
    if (!match6)
      continue;
    const imgSrc = `${IMG_URL}/${icon.name}/default/24px.svg`;
    pos++;
    results.push(makeSearchResult({
      title: icon.name,
      url: `https://fonts.google.com/icons?icon.query=${encodeURIComponent(icon.name)}&selected=Material+Symbols+Outlined:${icon.name}:FILL@0;wght@400;GRAD@0;opsz@24`,
      snippet: tags.slice(0, 3).join(", ") || "Material Icon",
      engine: "material-icons",
      position: pos,
      category: "image"
    }));
  }
  return results;
}

// src/search/engines/hex.ts
var API_URL35 = "https://hex.pm/api/packages";
var USER_AGENT123 = "opencode-search/1.0";
function makeHex(config) {
  return {
    name: config.name,
    config,
    search: (http, query, opts) => searchHex(http, query, opts.numResults || config.maxResults, config.timeout)
  };
}
function searchHex(http, query, numResults, timeout3) {
  return exports_Effect.gen(function* () {
    const params = new URLSearchParams({
      search: query,
      per_page: String(Math.min(numResults, 20))
    });
    const response = yield* http.execute(exports_HttpClientRequest.get(`${API_URL35}?${params.toString()}`).pipe(exports_HttpClientRequest.setHeaders({
      "User-Agent": USER_AGENT123,
      Accept: "application/json"
    }))).pipe(exports_Effect.timeout(timeout3));
    if (response.status < 200 || response.status >= 400)
      return [];
    const raw2 = yield* response.text;
    if (!raw2)
      return [];
    return parseHexResults(raw2, numResults);
  });
}
function parseHexResults(raw2, maxResults) {
  let parsed;
  try {
    parsed = JSON.parse(raw2);
  } catch {
    return [];
  }
  const items = parsed;
  if (!Array.isArray(items))
    return [];
  const results = [];
  let pos = 0;
  for (const item of items) {
    if (results.length >= maxResults)
      break;
    if (!item.name)
      continue;
    const version2 = item.latest_version || "";
    const description = item.meta?.description || "";
    const downloads = item.downloads?.all || 0;
    pos++;
    results.push(makeSearchResult({
      title: `${item.name}${version2 ? ` v${version2}` : ""}`,
      url: `https://hex.pm/packages/${item.name}`,
      snippet: description ? `[${downloads.toLocaleString()} downloads] ${description}`.trim() : `Hex package: ${item.name}`,
      engine: "hex",
      position: pos,
      publishedDate: item.inserted_at ? new Date(item.inserted_at).getTime() : undefined,
      category: "code"
    }));
  }
  return results;
}

// src/search/engines/microsoft-learn.ts
var API_URL36 = "https://learn.microsoft.com/api/search";
var USER_AGENT124 = "opencode-search/1.0";
function makeMicrosoftLearn(config) {
  return {
    name: config.name,
    config,
    search: (http, query, opts) => searchMicrosoftLearn(http, query, opts.numResults || config.maxResults, config.timeout)
  };
}
function searchMicrosoftLearn(http, query, numResults, timeout3) {
  return exports_Effect.gen(function* () {
    const params = new URLSearchParams({
      search: query,
      locale: "en-us",
      $top: String(Math.min(numResults, 10)),
      $skip: "0",
      partnerId: "LearnSite"
    });
    const response = yield* http.execute(exports_HttpClientRequest.get(`${API_URL36}?${params.toString()}`).pipe(exports_HttpClientRequest.setHeaders({
      "User-Agent": USER_AGENT124,
      Accept: "application/json"
    }))).pipe(exports_Effect.timeout(timeout3));
    if (response.status < 200 || response.status >= 400)
      return [];
    const raw2 = yield* response.text;
    if (!raw2)
      return [];
    return parseMicrosoftLearnResults(raw2, numResults);
  });
}
function parseMicrosoftLearnResults(raw2, maxResults) {
  let parsed;
  try {
    parsed = JSON.parse(raw2);
  } catch {
    return [];
  }
  const data = parsed;
  const items = data?.results;
  if (!Array.isArray(items))
    return [];
  const results = [];
  let pos = 0;
  for (const item of items) {
    if (results.length >= maxResults)
      break;
    if (!item.url || !item.title)
      continue;
    pos++;
    results.push(makeSearchResult({
      title: item.title,
      url: item.url,
      snippet: item.description || "Microsoft Learn documentation",
      engine: "microsoft-learn",
      position: pos,
      category: "general"
    }));
  }
  return results;
}

// src/search/engines/ansa.ts
var BASE_URL53 = "https://www.ansa.it";
var USER_AGENT125 = "opencode-search/1.0";
function makeAnsa(config) {
  return {
    name: config.name,
    config,
    search: (http, query, opts) => searchAnsa(http, query, opts.numResults || config.maxResults, config.timeout)
  };
}
function searchAnsa(http, query, numResults, timeout3) {
  return exports_Effect.gen(function* () {
    const params = new URLSearchParams({ q: query });
    const response = yield* http.execute(exports_HttpClientRequest.get(`${BASE_URL53}/ricerca?${params.toString()}`).pipe(exports_HttpClientRequest.setHeaders({
      "User-Agent": USER_AGENT125,
      Accept: "text/html"
    }))).pipe(exports_Effect.timeout(timeout3));
    if (response.status < 200 || response.status >= 400)
      return [];
    const html = yield* response.text;
    if (!html)
      return [];
    return parseAnsaResults(html, numResults);
  });
}
function parseAnsaResults(html, maxResults) {
  const results = [];
  let pos = 0;
  const itemRegex = /<article[^>]*>[\s\S]*?<a[^>]*href="([^"]*)"[^>]*>[\s\S]*?<img[^>]*src="([^"]*)"[^>]*alt="([^"]*)"[^>]*>[\s\S]*?<p[^>]*>([\s\S]*?)<\/p>[\s\S]*?<\/article>/gi;
  let match6;
  while ((match6 = itemRegex.exec(html)) !== null) {
    if (results.length >= maxResults)
      break;
    let href = match6[1].trim();
    const title = match6[3].trim();
    const snippet = match6[4].replace(/<[^>]+>/g, "").trim();
    if (!title || !href)
      continue;
    if (href.startsWith("/"))
      href = `${BASE_URL53}${href}`;
    else if (!href.startsWith("http"))
      href = `${BASE_URL53}/${href}`;
    pos++;
    results.push(makeSearchResult({
      title,
      url: href,
      snippet: snippet || "ANSA news",
      engine: "ansa",
      position: pos,
      category: "news"
    }));
  }
  return results;
}

// src/search/engines/senscritique.ts
var BASE_URL54 = "https://www.senscritique.com";
var USER_AGENT126 = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36";
function makeSensCritique(config) {
  return {
    name: config.name,
    config,
    search: (http, query, opts) => searchSensCritique(http, query, opts.numResults || config.maxResults, config.timeout)
  };
}
function searchSensCritique(http, query, numResults, timeout3) {
  return exports_Effect.gen(function* () {
    const params = new URLSearchParams({ q: query });
    const response = yield* http.execute(exports_HttpClientRequest.get(`${BASE_URL54}/search?${params.toString()}`).pipe(exports_HttpClientRequest.setHeaders({
      "User-Agent": USER_AGENT126,
      Accept: "text/html"
    }))).pipe(exports_Effect.timeout(timeout3));
    if (response.status < 200 || response.status >= 400)
      return [];
    const html = yield* response.text;
    if (!html)
      return [];
    return parseSensCritiqueResults(html, numResults);
  });
}
function parseSensCritiqueResults(html, maxResults) {
  const results = [];
  let pos = 0;
  const itemRegex = /<a[^>]*href="([^"]*)"[^>]*class="[^"]*[Ee]lla[Ii]tem[^"]*"[^>]*>[\s\S]*?<img[^>]*alt="([^"]*)"[^>]*>[\s\S]*?(?:<div[^>]*class="[^"]*[Tt]ext[^"]*"[^>]*>([\s\S]*?)<\/div>)?[\s\S]*?<\/a>/gi;
  let match6;
  while ((match6 = itemRegex.exec(html)) !== null) {
    if (results.length >= maxResults)
      break;
    let href = match6[1].trim();
    const title = match6[2].trim();
    const snippet = match6[3] ? match6[3].replace(/<[^>]+>/g, "").trim() : "";
    if (!title || !href)
      continue;
    if (href.startsWith("/"))
      href = `${BASE_URL54}${href}`;
    pos++;
    results.push(makeSearchResult({
      title,
      url: href,
      snippet: snippet || "SensCritique review",
      engine: "senscritique",
      position: pos,
      category: "general"
    }));
  }
  return results;
}

// src/search/engines/pdbe.ts
var SOLR_URL = "https://www.ebi.ac.uk/pdbe/search/pdb/select";
var ENTRY_URL = "https://www.ebi.ac.uk/pdbe/entry/pdb";
var USER_AGENT127 = "opencode-search/1.0";
function makePdbe(config) {
  return {
    name: config.name,
    config,
    search: (http, query, opts) => searchPdbe(http, query, opts.numResults || config.maxResults, config.timeout)
  };
}
function searchPdbe(http, query, numResults, timeout3) {
  return exports_Effect.gen(function* () {
    const body = new URLSearchParams({
      q: query,
      wt: "json",
      rows: String(Math.min(numResults, 20))
    }).toString();
    const response = yield* http.execute(exports_HttpClientRequest.post(SOLR_URL).pipe(exports_HttpClientRequest.setHeaders({
      "User-Agent": USER_AGENT127,
      "Content-Type": "application/x-www-form-urlencoded"
    }), exports_HttpClientRequest.bodyText(body))).pipe(exports_Effect.timeout(timeout3));
    if (response.status < 200 || response.status >= 400)
      return [];
    const raw2 = yield* response.text;
    if (!raw2)
      return [];
    return parsePdbeResults(raw2, numResults);
  });
}
function parsePdbeResults(raw2, maxResults) {
  let parsed;
  try {
    parsed = JSON.parse(raw2);
  } catch {
    return [];
  }
  const data = parsed;
  const docs = data?.response?.docs;
  if (!Array.isArray(docs))
    return [];
  const results = [];
  let pos = 0;
  for (const doc of docs) {
    if (results.length >= maxResults)
      break;
    if (!doc.pdb_id)
      continue;
    const isObsolete = doc.status === "OBS";
    const title = isObsolete ? `${doc.title || "Unknown"} (OBSOLETE)` : doc.citation_title || doc.title || `PDB ${doc.pdb_id}`;
    const authors = doc.entry_author_list?.[0] || "";
    const year = doc.citation_year || doc.release_year || "";
    const snippet = isObsolete ? `This entry has been superseded` : `${authors}${year ? ` (${year})` : ""}`.trim();
    pos++;
    results.push(makeSearchResult({
      title,
      url: `${ENTRY_URL}/${doc.pdb_id}`,
      snippet: snippet || `PDBe entry: ${doc.pdb_id}`,
      engine: "pdbe",
      position: pos,
      category: "academic"
    }));
  }
  return results;
}

// src/search/engines/moviepilot.ts
var BASE_URL55 = "https://www.moviepilot.de";
var USER_AGENT128 = "opencode-search/1.0";
function makeMoviepilot(config) {
  return {
    name: config.name,
    config,
    search: (http, query, opts) => searchMoviepilot(http, query, opts.numResults || config.maxResults, config.timeout)
  };
}
function searchMoviepilot(http, query, numResults, timeout3) {
  return exports_Effect.gen(function* () {
    const params = new URLSearchParams({
      q: query,
      page: "1",
      type: "suggest"
    });
    const response = yield* http.execute(exports_HttpClientRequest.get(`${BASE_URL55}/api/search?${params.toString()}`).pipe(exports_HttpClientRequest.setHeaders({
      "User-Agent": USER_AGENT128,
      Accept: "application/json"
    }))).pipe(exports_Effect.timeout(timeout3));
    if (response.status < 200 || response.status >= 400)
      return [];
    const raw2 = yield* response.text;
    if (!raw2)
      return [];
    return parseMoviepilotResults(raw2, numResults);
  });
}
function parseMoviepilotResults(raw2, maxResults) {
  let parsed;
  try {
    parsed = JSON.parse(raw2);
  } catch {
    return [];
  }
  const items = parsed;
  if (!Array.isArray(items))
    return [];
  const results = [];
  let pos = 0;
  for (const item of items) {
    if (results.length >= maxResults)
      break;
    if (!item.title)
      continue;
    const url = item.url?.startsWith("http") ? item.url : `${BASE_URL55}${item.url || ""}`;
    const info = [item.class, item.info, item.more].filter(Boolean).join(", ");
    pos++;
    results.push(makeSearchResult({
      title: item.title,
      url,
      snippet: info || "Moviepilot entry",
      engine: "moviepilot",
      position: pos,
      category: "general"
    }));
  }
  return results;
}

// src/search/engines/annas-archive.ts
var MIRRORS2 = [
  "https://annas-archive.gl",
  "https://annas-archive.vg",
  "https://annas-archive.pk",
  "https://annas-archive.gd"
];
var USER_AGENT129 = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
function makeAnnasArchive(config) {
  return {
    name: config.name,
    config,
    search: (http, query, opts) => searchAnnasArchive(http, query, opts.numResults || config.maxResults, config.timeout)
  };
}
function searchAnnasArchive(http, query, numResults, timeout3) {
  const searchLoop = (idx) => exports_Effect.gen(function* () {
    if (idx >= MIRRORS2.length)
      return [];
    const results = yield* tryMirror2(http, MIRRORS2[idx], query, numResults, timeout3).pipe(exports_Effect.catchIf(() => true, () => exports_Effect.succeed([])));
    if (results.length > 0)
      return results;
    return yield* searchLoop(idx + 1);
  });
  return searchLoop(0);
}
function tryMirror2(http, baseUrl2, query, numResults, timeout3) {
  return exports_Effect.gen(function* () {
    const params = new URLSearchParams({ q: query, page: "1" });
    const response = yield* http.execute(exports_HttpClientRequest.get(`${baseUrl2}/search?${params.toString()}`).pipe(exports_HttpClientRequest.setHeaders({ "User-Agent": USER_AGENT129, Accept: "text/html" }))).pipe(exports_Effect.timeout(timeout3 * 0.8));
    if (response.status < 200 || response.status >= 400)
      return [];
    const html = yield* response.text.pipe(exports_Effect.catchIf(() => true, () => exports_Effect.succeed("")));
    if (!html)
      return [];
    return parseAnnasArchiveResults(html, numResults, baseUrl2);
  });
}
function parseAnnasArchiveResults(html, maxResults, baseUrl2) {
  const results = [];
  let pos = 0;
  const itemRegex = /<div[^>]*class="[^"]*flex[^"]*"[^>]*>[\s\S]*?<a[^>]*href="([^"]*)"[^>]*>[\s\S]*?<a[^>]*class="[^"]*js-vim-focus[^"]*"[^>]*>([\s\S]*?)<\/a>[\s\S]*?(?:<div[^>]*class="[^"]*line-clamp[^"]*"[^>]*>([\s\S]*?)<\/div>)?[\s\S]*?<img[^>]*src="([^"]*)"[^>]*>[\s\S]*?<\/div>/gi;
  let match6;
  while ((match6 = itemRegex.exec(html)) !== null) {
    if (results.length >= maxResults)
      break;
    let href = match6[1].trim();
    const title = match6[2].replace(/<[^>]+>/g, "").trim();
    const content = match6[3] ? match6[3].replace(/<[^>]+>/g, "").trim() : "";
    if (!title || !href)
      continue;
    if (href.startsWith("/"))
      href = `${baseUrl2}${href}`;
    pos++;
    results.push(makeSearchResult({
      title,
      url: href,
      snippet: content || "Anna's Archive book",
      engine: "annas-archive",
      position: pos,
      category: "general"
    }));
  }
  return results;
}

// src/search/engines/iqiyi.ts
var BASE_URL56 = "https://so.iqiyi.com";
var USER_AGENT130 = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
function makeIqiyi(config) {
  return {
    name: config.name,
    config,
    search: (http, query, opts) => searchIqiyi(http, query, opts.numResults || config.maxResults, config.timeout)
  };
}
function searchIqiyi(http, query, numResults, timeout3) {
  return exports_Effect.gen(function* () {
    const url = `${BASE_URL56}/so/q_${encodeURIComponent(query)}`;
    const response = yield* http.execute(exports_HttpClientRequest.get(url).pipe(exports_HttpClientRequest.setHeaders({
      "User-Agent": USER_AGENT130,
      Accept: "text/html",
      Referer: `${BASE_URL56}/`
    }))).pipe(exports_Effect.timeout(timeout3));
    if (response.status < 200 || response.status >= 400)
      return [];
    const html = yield* response.text;
    if (!html)
      return [];
    return parseIqiyiResults(html, numResults);
  });
}
function parseIqiyiResults(html, maxResults) {
  const results = [];
  let pos = 0;
  const itemRegex = /<a[^>]*href="([^"]*)"[^>]*class="[^"]*[Ss]earch-[Rr]esult[Ii]tem[^"]*"[^>]*>[\s\S]*?<img[^>]*src="([^"]*)"[^>]*alt="([^"]*)"[^>]*>[\s\S]*?(?:<[^>]+class="[^"]*[Dd]uration[^"]*"[^>]*>([^<]+)<)?[\s\S]*?<\/a>/gi;
  const fallbackRegex = /<a[^>]*href="(\/video\/[^"]*)"[^>]*>[\s\S]*?<img[^>]*src="([^"]*)"[^>]*alt="([^"]*)"[^>]*>/gi;
  let match6;
  while ((match6 = itemRegex.exec(html)) !== null) {
    if (results.length >= maxResults)
      break;
    let href = match6[1].trim();
    const title = match6[3].trim();
    const duration = match6[4]?.trim() || "";
    if (!title || !href)
      continue;
    if (href.startsWith("//"))
      href = `https:${href}`;
    else if (href.startsWith("/"))
      href = `https:${href}`;
    pos++;
    results.push(makeSearchResult({
      title,
      url: href,
      snippet: duration ? `[${duration}] iQiyi video` : "iQiyi video",
      engine: "iqiyi",
      position: pos,
      category: "video"
    }));
  }
  if (results.length === 0) {
    let fMatch;
    while ((fMatch = fallbackRegex.exec(html)) !== null) {
      if (results.length >= maxResults)
        break;
      let fHref = fMatch[1].trim();
      const fTitle = fMatch[3].trim();
      if (!fTitle)
        continue;
      if (fHref.startsWith("//"))
        fHref = `https:${fHref}`;
      else if (fHref.startsWith("/"))
        fHref = `https:${fHref}`;
      pos++;
      results.push(makeSearchResult({
        title: fTitle,
        url: fHref,
        snippet: "iQiyi video",
        engine: "iqiyi",
        position: pos,
        category: "video"
      }));
    }
  }
  return results;
}

// src/search/engines/adobe-stock.ts
var BASE_URL57 = "https://stock.adobe.com";
var USER_AGENT131 = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
function makeAdobeStock(config) {
  return {
    name: config.name,
    config,
    search: (http, query, opts) => searchAdobeStock(http, query, opts.numResults || config.maxResults, config.timeout)
  };
}
function searchAdobeStock(http, query, numResults, timeout3) {
  return exports_Effect.gen(function* () {
    const params = new URLSearchParams({
      k: query,
      limit: String(Math.min(numResults, 20)),
      order: "relevance",
      search_page: "1",
      search_type: "pagination",
      "filters[content_type:photo]": "1",
      "filters[content_type:illustration]": "1",
      "filters[content_type:zip_vector]": "1",
      "filters[content_type:template]": "0",
      "filters[content_type:3d]": "0",
      "filters[content_type:image]": "1"
    });
    const response = yield* http.execute(exports_HttpClientRequest.get(`${BASE_URL57}/de/Ajax/Search?${params.toString()}`).pipe(exports_HttpClientRequest.setHeaders({
      "User-Agent": USER_AGENT131,
      Accept: "application/json",
      "Accept-Language": "en-US,en;q=0.5"
    }))).pipe(exports_Effect.timeout(timeout3));
    if (response.status < 200 || response.status >= 400)
      return [];
    const raw2 = yield* response.text;
    if (!raw2)
      return [];
    return parseAdobeStockResults(raw2, numResults);
  });
}
function parseAdobeStockResults(raw2, maxResults) {
  let parsed;
  try {
    parsed = JSON.parse(raw2);
  } catch {
    return [];
  }
  const data = parsed;
  const items = data?.items;
  if (!items || typeof items !== "object")
    return [];
  const results = [];
  let pos = 0;
  for (const key of Object.keys(items)) {
    if (results.length >= maxResults)
      break;
    const item = items[key];
    if (!item?.content_url || !item.title)
      continue;
    const resolution = item.content_original_width && item.content_original_height ? `${item.content_original_width}x${item.content_original_height}` : "";
    const assetType = item.asset_type || "";
    const author = item.author || "";
    const format3 = item.format || "";
    const parts2 = [assetType, resolution, format3, author].filter(Boolean);
    const snippet = parts2.join(" · ");
    pos++;
    results.push(makeSearchResult({
      title: item.title,
      url: item.content_url,
      snippet: snippet || "Adobe Stock image",
      engine: "adobe-stock",
      position: pos,
      category: "image"
    }));
  }
  return results;
}

// src/search/engines/mojeek.ts
var BASE_URL58 = "https://www.mojeek.com";
var USER_AGENT132 = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
function makeMojeek(config) {
  return {
    name: config.name,
    config,
    search: (http, query, opts) => searchMojeek(http, query, opts.numResults || config.maxResults, config.timeout)
  };
}
function searchMojeek(http, query, numResults, timeout3) {
  return exports_Effect.gen(function* () {
    const params = new URLSearchParams({ q: query, s: "6" });
    const response = yield* http.execute(exports_HttpClientRequest.get(`${BASE_URL58}/search?${params.toString()}`).pipe(exports_HttpClientRequest.setHeaders({
      "User-Agent": USER_AGENT132,
      Accept: "text/html"
    }))).pipe(exports_Effect.timeout(timeout3));
    if (response.status < 200 || response.status >= 400)
      return [];
    const html = yield* response.text;
    if (!html)
      return [];
    return parseMojeekResults(html, numResults);
  });
}
function parseMojeekResults(html, maxResults) {
  const results = [];
  let pos = 0;
  const itemRegex = /<a[^>]*class="[^"]*title[^"]*"[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<p[^>]*class="[^"]*teaser[^"]*"[^>]*>([\s\S]*?)<\/p>/gi;
  let match6;
  while ((match6 = itemRegex.exec(html)) !== null) {
    if (results.length >= maxResults)
      break;
    let url = match6[1].trim();
    const title = match6[2].replace(/<[^>]+>/g, "").trim();
    const snippet = match6[3].replace(/<[^>]+>/g, "").trim();
    if (!title || !url)
      continue;
    if (url.startsWith("/"))
      url = `${BASE_URL58}${url}`;
    pos++;
    results.push(makeSearchResult({
      title,
      url,
      snippet: snippet || "Mojeek search result",
      engine: "mojeek",
      position: pos,
      category: "general"
    }));
  }
  return results;
}

// src/search/engines/jisho.ts
var API_URL37 = "https://jisho.org/api/v1/search/words";
var BASE_URL59 = "https://jisho.org/word/";
var USER_AGENT133 = "opencode-search/1.0";
function makeJisho(config) {
  return {
    name: config.name,
    config,
    search: (http, query, opts) => searchJisho(http, query, opts.numResults || config.maxResults, config.timeout)
  };
}
function searchJisho(http, query, numResults, timeout3) {
  return exports_Effect.gen(function* () {
    const params = new URLSearchParams({ keyword: query });
    const response = yield* http.execute(exports_HttpClientRequest.get(`${API_URL37}?${params.toString()}`).pipe(exports_HttpClientRequest.setHeaders({
      "User-Agent": USER_AGENT133,
      Accept: "application/json"
    }))).pipe(exports_Effect.timeout(timeout3));
    if (response.status < 200 || response.status >= 400)
      return [];
    const raw2 = yield* response.text;
    if (!raw2)
      return [];
    return parseJishoResults(raw2, numResults);
  });
}
function parseJishoResults(raw2, maxResults) {
  let parsed;
  try {
    parsed = JSON.parse(raw2);
  } catch {
    return [];
  }
  const data = parsed;
  const entries = data?.data;
  if (!Array.isArray(entries))
    return [];
  const results = [];
  let pos = 0;
  for (const entry of entries) {
    if (results.length >= maxResults)
      break;
    if (!entry.slug)
      continue;
    const altForms = entry.japanese.map((j) => {
      if (!j.word)
        return j.reading || "";
      return j.reading ? `${j.word} (${j.reading})` : j.word;
    }).filter(Boolean);
    const title = altForms.join(", ");
    if (!title)
      continue;
    const definitions = entry.senses.flatMap((s) => s.english_definitions || []).join("; ");
    if (!definitions)
      continue;
    const url = `${BASE_URL59}${entry.slug}`;
    pos++;
    results.push(makeSearchResult({
      title: title.slice(0, 200),
      url,
      snippet: definitions.slice(0, 300),
      engine: "jisho",
      position: pos,
      category: "general"
    }));
  }
  return results;
}

// src/search/engines/radio-browser.ts
var API_BASE4 = "https://de1.api.radio-browser.info/json/stations";
var USER_AGENT134 = "opencode-search/1.0";
function makeRadioBrowser(config) {
  return {
    name: config.name,
    config,
    search: (http, query, opts) => searchRadioBrowser(http, query, opts.numResults || config.maxResults, config.timeout)
  };
}
function searchRadioBrowser(http, query, numResults, timeout3) {
  return exports_Effect.gen(function* () {
    const params = new URLSearchParams({
      search: query,
      order: "clickcount",
      reverse: "true",
      limit: String(Math.min(numResults, 30))
    });
    const response = yield* http.execute(exports_HttpClientRequest.get(`${API_BASE4}?${params.toString()}`).pipe(exports_HttpClientRequest.setHeaders({
      "User-Agent": USER_AGENT134,
      Accept: "application/json"
    }))).pipe(exports_Effect.timeout(timeout3));
    if (response.status < 200 || response.status >= 400)
      return [];
    const raw2 = yield* response.text;
    if (!raw2)
      return [];
    return parseRadioBrowserResults(raw2, numResults);
  });
}
function parseRadioBrowserResults(raw2, maxResults) {
  let parsed;
  try {
    parsed = JSON.parse(raw2);
  } catch {
    return [];
  }
  const stations = parsed;
  if (!Array.isArray(stations))
    return [];
  const results = [];
  let pos = 0;
  for (const station of stations) {
    if (results.length >= maxResults)
      break;
    if (!station.name || !station.url)
      continue;
    const tags = (station.tags || "").split(",").map((t) => t.trim()).filter(Boolean).slice(0, 3).join(", ");
    const parts2 = [
      tags,
      station.country,
      station.language,
      station.codec,
      station.bitrate ? `${station.bitrate}kbps` : ""
    ].filter(Boolean);
    const snippet = parts2.join(" · ");
    pos++;
    results.push(makeSearchResult({
      title: station.name,
      url: station.homepage || station.url,
      snippet: snippet || "Radio station",
      engine: "radio-browser",
      position: pos,
      category: "general"
    }));
  }
  return results;
}

// src/search/engines/sepiasearch.ts
var API_URL38 = "https://sepiasearch.org/api/v1/search/videos";
var USER_AGENT135 = "opencode-search/1.0";
function makeSepiaSearch(config) {
  return {
    name: config.name,
    config,
    search: (http, query, opts) => searchSepiaSearch(http, query, opts.numResults || config.maxResults, config.timeout)
  };
}
function searchSepiaSearch(http, query, numResults, timeout3) {
  return exports_Effect.gen(function* () {
    const params = new URLSearchParams({
      search: query,
      start: "0",
      count: String(Math.min(numResults, 20)),
      sort: "-createdAt"
    });
    const response = yield* http.execute(exports_HttpClientRequest.get(`${API_URL38}?${params.toString()}`).pipe(exports_HttpClientRequest.setHeaders({
      "User-Agent": USER_AGENT135,
      Accept: "application/json"
    }))).pipe(exports_Effect.timeout(timeout3));
    if (response.status < 200 || response.status >= 400)
      return [];
    const raw2 = yield* response.text;
    if (!raw2)
      return [];
    return parseSepiaSearchResults(raw2, numResults);
  });
}
function parseSepiaSearchResults(raw2, maxResults) {
  let parsed;
  try {
    parsed = JSON.parse(raw2);
  } catch {
    return [];
  }
  const response = parsed;
  const videos = response?.data;
  if (!Array.isArray(videos))
    return [];
  const results = [];
  let pos = 0;
  for (const video of videos) {
    if (results.length >= maxResults)
      break;
    if (!video.name || !video.uuid)
      continue;
    const channel = video.channel?.name || "";
    const duration = video.duration ? formatDuration4(video.duration) : "";
    const views = video.views ? `${video.views} views` : "";
    const snippet = [channel, duration, views].filter(Boolean).join(" · ");
    pos++;
    results.push(makeSearchResult({
      title: video.name,
      url: video.url || `https://sepiasearch.org/videos/watch/${video.uuid}`,
      snippet: snippet || "PeerTube video",
      engine: "sepiasearch",
      position: pos,
      publishedDate: video.createdAt ? new Date(video.createdAt).getTime() : undefined,
      category: "video"
    }));
  }
  return results;
}
function formatDuration4(seconds2) {
  const h = Math.floor(seconds2 / 3600);
  const m = Math.floor(seconds2 % 3600 / 60);
  const s = seconds2 % 60;
  if (h > 0)
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}
// src/search/engines/repology.ts
var WEB_URL4 = "https://repology.org/projects";
var USER_AGENT136 = "opencode-search/1.0";
function makeRepology(config) {
  return {
    name: config.name,
    config,
    search: (http, query, opts) => searchRepology(http, query, opts.numResults || config.maxResults, config.timeout)
  };
}
function searchRepology(http, query, numResults, timeout3) {
  return exports_Effect.gen(function* () {
    const params = new URLSearchParams({ search: query });
    const response = yield* http.execute(exports_HttpClientRequest.get(`${WEB_URL4}?${params.toString()}`).pipe(exports_HttpClientRequest.setHeaders({
      "User-Agent": USER_AGENT136,
      Accept: "application/json"
    }))).pipe(exports_Effect.timeout(timeout3));
    if (response.status < 200 || response.status >= 400)
      return [];
    const raw2 = yield* response.text;
    if (!raw2)
      return [];
    return parseRepologyResults(raw2, query, numResults);
  });
}
function parseRepologyResults(raw2, query, maxResults) {
  const projects = {};
  try {
    Object.assign(projects, JSON.parse(raw2));
  } catch {
    return [];
  }
  const names = Object.keys(projects).slice(0, maxResults);
  if (names.length === 0)
    return [];
  const results = [];
  let pos = 0;
  for (const name of names) {
    if (results.length >= maxResults)
      break;
    const pkgs = projects[name];
    if (!pkgs?.length)
      continue;
    const newest = pkgs.find((p) => p.status === "newest") || pkgs[0];
    const uniqueRepos = [...new Set(pkgs.map((p) => p.repo).filter(Boolean))];
    const summary = pkgs.find((p) => p.summary)?.summary || "";
    pos++;
    results.push(makeSearchResult({
      title: name,
      url: `https://repology.org/project/${encodeURIComponent(name)}`,
      snippet: `${newest.version || "?"} · ${uniqueRepos.length} repos · ${summary}`.slice(0, 300),
      engine: "repology",
      position: pos,
      category: "code"
    }));
  }
  return results;
}

// src/search/engines/artic.ts
var API_URL39 = "https://api.artic.edu/api/v1/artworks/search";
var IMAGE_URL = "https://www.artic.edu/iiif/2";
var USER_AGENT137 = "opencode-search/1.0";
function makeArtic(config) {
  return {
    name: config.name,
    config,
    search: (http, query, opts) => searchArtic(http, query, opts.numResults || config.maxResults, config.timeout)
  };
}
function searchArtic(http, query, numResults, timeout3) {
  return exports_Effect.gen(function* () {
    const params = new URLSearchParams({
      q: query,
      limit: String(Math.min(numResults, 20))
    });
    const response = yield* http.execute(exports_HttpClientRequest.get(`${API_URL39}?${params.toString()}`).pipe(exports_HttpClientRequest.setHeaders({
      "User-Agent": USER_AGENT137,
      Accept: "application/json"
    }))).pipe(exports_Effect.timeout(timeout3));
    if (response.status < 200 || response.status >= 400)
      return [];
    const raw2 = yield* response.text;
    if (!raw2)
      return [];
    return parseArticResults(raw2, numResults);
  });
}
function parseArticResults(raw2, maxResults) {
  let parsed;
  try {
    parsed = JSON.parse(raw2);
  } catch {
    return [];
  }
  const response = parsed;
  const artworks = response?.data;
  if (!Array.isArray(artworks))
    return [];
  const iiifBase = response?.config?.iiif_url || IMAGE_URL;
  const results = [];
  let pos = 0;
  for (const artwork of artworks) {
    if (results.length >= maxResults)
      break;
    if (!artwork.title || !artwork.id)
      continue;
    const artist = artwork.artist_title || "Unknown artist";
    const date = artwork.date_display || "";
    const medium = artwork.medium_display || "";
    const snippet = [artist, date, medium].filter(Boolean).join(" · ");
    pos++;
    results.push(makeSearchResult({
      title: artwork.title,
      url: `https://www.artic.edu/artworks/${artwork.id}`,
      snippet: snippet || "Artwork from Art Institute of Chicago",
      engine: "artic",
      position: pos,
      category: "image"
    }));
  }
  return results;
}

// src/search/engines/nvd.ts
var API_URL40 = "https://nvd.nist.gov/extensions/nudp/services/json/nvd/cve/search/results";
var USER_AGENT138 = "opencode-search/1.0";
function makeNvd(config) {
  return {
    name: config.name,
    config,
    search: (http, query, opts) => searchNvd(http, query, opts.numResults || config.maxResults, config.timeout)
  };
}
function searchNvd(http, query, numResults, timeout3) {
  return exports_Effect.gen(function* () {
    const params = new URLSearchParams({
      resultType: "records",
      keyword: query,
      rowCount: String(Math.min(numResults, 20)),
      offset: "0"
    });
    const response = yield* http.execute(exports_HttpClientRequest.get(`${API_URL40}?${params.toString()}`).pipe(exports_HttpClientRequest.setHeaders({
      "User-Agent": USER_AGENT138,
      Accept: "application/json",
      Referer: "https://nvd.nist.gov/vuln/search"
    }))).pipe(exports_Effect.timeout(timeout3));
    if (response.status < 200 || response.status >= 400)
      return [];
    const raw2 = yield* response.text;
    if (!raw2)
      return [];
    return parseNvdResults(raw2, numResults);
  });
}
function parseNvdResults(raw2, maxResults) {
  let parsed;
  try {
    parsed = JSON.parse(raw2);
  } catch {
    return [];
  }
  const data = parsed;
  const vulns = data?.response?.[0]?.grid?.vulnerabilities;
  if (!Array.isArray(vulns))
    return [];
  const results = [];
  let pos = 0;
  for (const item of vulns) {
    if (results.length >= maxResults)
      break;
    const cve = item?.cve;
    if (!cve?.id)
      continue;
    const cveId = cve.id;
    const description = cve.descriptions?.[0]?.value || "";
    const published = cve.published ? new Date(cve.published).getTime() : undefined;
    const cvss = cve.metrics?.cvssMetricV31?.[0]?.cvssData;
    const severity = cvss?.baseSeverity || "";
    const score = cvss?.baseScore;
    const meta = score ? `CVSS ${score} ${severity}` : severity;
    pos++;
    results.push(makeSearchResult({
      title: cveId,
      url: `https://nvd.nist.gov/vuln/detail/${cveId}`,
      snippet: [meta, description].filter(Boolean).join(" — ").slice(0, 300),
      engine: "nvd",
      position: pos,
      publishedDate: published,
      category: "general"
    }));
  }
  return results;
}

// src/search/engines/loc.ts
var BASE_URL60 = "https://www.loc.gov";
var USER_AGENT139 = "opencode-search/1.0";
function makeLoc(config) {
  return {
    name: config.name,
    config,
    search: (http, query, opts) => searchLoc(http, query, opts.numResults || config.maxResults, config.timeout)
  };
}
function searchLoc(http, query, numResults, timeout3) {
  return exports_Effect.gen(function* () {
    const params = new URLSearchParams({ q: query, fo: "json" });
    const response = yield* http.execute(exports_HttpClientRequest.get(`${BASE_URL60}/photos/?${params.toString()}`).pipe(exports_HttpClientRequest.setHeaders({
      "User-Agent": USER_AGENT139,
      Accept: "application/json"
    }))).pipe(exports_Effect.timeout(timeout3));
    if (response.status < 200 || response.status >= 400)
      return [];
    const raw2 = yield* response.text;
    if (!raw2)
      return [];
    return parseLocResults(raw2, numResults);
  });
}
function parseLocResults(raw2, maxResults) {
  let parsed;
  try {
    parsed = JSON.parse(raw2);
  } catch {
    return [];
  }
  const data = parsed;
  const results_arr = data?.results;
  if (!Array.isArray(results_arr))
    return [];
  const results = [];
  let pos = 0;
  for (const result3 of results_arr) {
    if (results.length >= maxResults)
      break;
    const url = result3?.item?.link;
    if (!url)
      continue;
    const title = (result3.title || "").replace(/^\[/, "").replace(/\]$/, "");
    const item = result3.item;
    const parts2 = [
      item?.created_published_date,
      item?.summary?.[0],
      item?.notes?.[0],
      item?.part_of?.[0]
    ].filter(Boolean);
    const snippet = parts2.join(" / ") || "Library of Congress image";
    pos++;
    results.push(makeSearchResult({
      title,
      url,
      snippet: snippet.slice(0, 300),
      engine: "loc",
      position: pos,
      category: "image"
    }));
  }
  return results;
}

// src/search/engines/1x.ts
var BASE_URL61 = "https://1x.com";
var SEARCH_URL20 = "https://1x.com/backend/search.php";
var USER_AGENT140 = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
function make1x(config) {
  return {
    name: config.name,
    config,
    search: (http, query, opts) => search1x(http, query, opts.numResults || config.maxResults, config.timeout)
  };
}
function search1x(http, query, numResults, timeout3) {
  return exports_Effect.gen(function* () {
    const response = yield* http.execute(exports_HttpClientRequest.get(`${SEARCH_URL20}?q=${encodeURIComponent(query)}`).pipe(exports_HttpClientRequest.setHeaders({
      "User-Agent": USER_AGENT140,
      Accept: "text/html,application/xhtml+xml,application/xml"
    }))).pipe(exports_Effect.timeout(timeout3));
    if (response.status < 200 || response.status >= 400)
      return [];
    const raw2 = yield* response.text;
    if (!raw2)
      return [];
    return parse1xResults(raw2, numResults);
  });
}
function parse1xResults(body, maxResults) {
  const results = [];
  let pos = 0;
  const linkRegex = /<a[^>]*href="(\/photo\/[^"]*)"[^>]*>([\s\S]*?)<\/a>/gi;
  let match6;
  while ((match6 = linkRegex.exec(body)) !== null) {
    if (results.length >= maxResults)
      break;
    const url = `${BASE_URL61}${match6[1].trim()}`;
    const title = match6[2].replace(/<[^>]+>/g, "").trim();
    if (!title || !url)
      continue;
    pos++;
    results.push(makeSearchResult({
      title,
      url,
      snippet: "1x.com art photography",
      engine: "1x",
      position: pos,
      category: "image"
    }));
  }
  return results;
}

// src/search/engines/tootfinder.ts
var API_URL41 = "https://www.tootfinder.ch/rest/api/search";
var USER_AGENT141 = "opencode-search/1.0";
function makeTootfinder(config) {
  return {
    name: config.name,
    config,
    search: (http, query, opts) => searchTootfinder(http, query, opts.numResults || config.maxResults, config.timeout)
  };
}
function searchTootfinder(http, query, numResults, timeout3) {
  return exports_Effect.gen(function* () {
    const response = yield* http.execute(exports_HttpClientRequest.get(`${API_URL41}/${encodeURIComponent(query)}`).pipe(exports_HttpClientRequest.setHeaders({
      "User-Agent": USER_AGENT141,
      Accept: "application/json"
    }))).pipe(exports_Effect.timeout(timeout3));
    if (response.status < 200 || response.status >= 400)
      return [];
    const raw2 = yield* response.text;
    if (!raw2)
      return [];
    return parseTootfinderResults(raw2, numResults);
  });
}
function parseTootfinderResults(raw2, maxResults) {
  let data;
  for (const line of raw2.split(`
`)) {
    if (line.startsWith("[{")) {
      try {
        data = JSON.parse(line);
      } catch {}
      break;
    }
  }
  if (!data) {
    try {
      data = JSON.parse(raw2);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(data))
    return [];
  const results = [];
  let pos = 0;
  for (const item of data) {
    if (results.length >= maxResults)
      break;
    if (!item.url)
      continue;
    const title = item.card?.title || item.content?.replace(/<[^>]+>/g, "").slice(0, 75) || "Toot";
    const snippet = item.content?.replace(/<[^>]+>/g, "").slice(0, 300) || "";
    const publishedDate = item.created_at ? new Date(item.created_at).getTime() : undefined;
    pos++;
    results.push(makeSearchResult({
      title,
      url: item.url,
      snippet,
      engine: "tootfinder",
      position: pos,
      publishedDate,
      category: "social"
    }));
  }
  return results;
}

// src/search/engines/grokipedia.ts
var API_URL42 = "https://grokipedia.com/api/full-text-search";
var USER_AGENT142 = "opencode-search/1.0";
function makeGrokipedia(config) {
  return {
    name: config.name,
    config,
    search: (http, query, opts) => searchGrokipedia(http, query, opts.numResults || config.maxResults, config.timeout)
  };
}
function searchGrokipedia(http, query, numResults, timeout3) {
  return exports_Effect.gen(function* () {
    const params = new URLSearchParams({
      query,
      limit: String(Math.min(numResults, 20)),
      offset: "0"
    });
    const response = yield* http.execute(exports_HttpClientRequest.get(`${API_URL42}?${params.toString()}`).pipe(exports_HttpClientRequest.setHeaders({
      "User-Agent": USER_AGENT142,
      Accept: "application/json"
    }))).pipe(exports_Effect.timeout(timeout3));
    if (response.status < 200 || response.status >= 400)
      return [];
    const raw2 = yield* response.text;
    if (!raw2)
      return [];
    return parseGrokipediaResults(raw2, numResults);
  });
}
function parseGrokipediaResults(raw2, maxResults) {
  let parsed;
  try {
    parsed = JSON.parse(raw2);
  } catch {
    return [];
  }
  const data = parsed;
  const items = data?.results;
  if (!Array.isArray(items))
    return [];
  const results = [];
  let pos = 0;
  for (const item of items) {
    if (results.length >= maxResults)
      break;
    if (!item.slug || !item.title)
      continue;
    pos++;
    results.push(makeSearchResult({
      title: item.title,
      url: `https://grokipedia.com/page/${item.slug}`,
      snippet: item.snippet?.replace(/<[^>]+>/g, "").slice(0, 300) || "",
      engine: "grokipedia",
      position: pos,
      category: "general"
    }));
  }
  return results;
}

// src/search/engines/findthatmeme.ts
var API_URL43 = "https://findthatmeme.com/api/v1/search";
var USER_AGENT143 = "opencode-search/1.0";
function makeFindThatMeme(config) {
  return {
    name: config.name,
    config,
    search: (http, query, opts) => searchFindThatMeme(http, query, opts.numResults || config.maxResults, config.timeout)
  };
}
function searchFindThatMeme(http, query, numResults, timeout3) {
  return exports_Effect.gen(function* () {
    const body = JSON.stringify({ search: query, offset: 0 });
    const response = yield* http.execute(exports_HttpClientRequest.post(API_URL43).pipe(exports_HttpClientRequest.setHeaders({
      "User-Agent": USER_AGENT143,
      "Content-Type": "application/json",
      Accept: "application/json"
    }), exports_HttpClientRequest.bodyText(body))).pipe(exports_Effect.timeout(timeout3));
    if (response.status < 200 || response.status >= 400)
      return [];
    const raw2 = yield* response.text;
    if (!raw2)
      return [];
    return parseFindThatMemeResults(raw2, numResults);
  });
}
function parseFindThatMemeResults(raw2, maxResults) {
  let parsed;
  try {
    parsed = JSON.parse(raw2);
  } catch {
    return [];
  }
  const items = parsed;
  if (!Array.isArray(items))
    return [];
  const results = [];
  let pos = 0;
  for (const item of items) {
    if (results.length >= maxResults)
      break;
    if (!item.source_page_url)
      continue;
    const title = item.source_site || "Meme";
    const size = item.meme_file_size ? formatBytes(item.meme_file_size) : "";
    pos++;
    results.push(makeSearchResult({
      title,
      url: item.source_page_url,
      snippet: size ? `Size: ${size}` : "FindThatMeme",
      engine: "findthatmeme",
      position: pos,
      category: "image"
    }));
  }
  return results;
}
function formatBytes(bytes) {
  if (bytes >= 1048576)
    return `${(bytes / 1048576).toFixed(1)} MB`;
  if (bytes >= 1024)
    return `${(bytes / 1024).toFixed(1)} KB`;
  return `${bytes} B`;
}

// src/search/engines/apkmirror.ts
var BASE_URL62 = "https://www.apkmirror.com";
var USER_AGENT144 = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
function makeApkMirror(config) {
  return {
    name: config.name,
    config,
    search: (http, query, opts) => searchApkMirror(http, query, opts.numResults || config.maxResults, config.timeout)
  };
}
function searchApkMirror(http, query, numResults, timeout3) {
  return exports_Effect.gen(function* () {
    const params = new URLSearchParams({
      post_type: "app_release",
      searchtype: "apk",
      s: query
    });
    const response = yield* http.execute(exports_HttpClientRequest.get(`${BASE_URL62}/?${params.toString()}`).pipe(exports_HttpClientRequest.setHeaders({
      "User-Agent": USER_AGENT144,
      Accept: "text/html"
    }))).pipe(exports_Effect.timeout(timeout3));
    if (response.status < 200 || response.status >= 400)
      return [];
    const html = yield* response.text;
    if (!html)
      return [];
    return parseApkMirrorResults(html, numResults);
  });
}
function parseApkMirrorResults(html, maxResults) {
  const results = [];
  let pos = 0;
  const itemRegex = /<div[^>]*class="[^"]*appRow[^"]*"[^>]*>[\s\S]*?<h5><a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<img[^>]*src="([^"]*)"[^>]*>/gi;
  let match6;
  while ((match6 = itemRegex.exec(html)) !== null) {
    if (results.length >= maxResults)
      break;
    let href = match6[1].trim();
    const title = match6[2].replace(/<[^>]+>/g, "").trim();
    const _thumbnail = match6[3];
    if (!title || !href)
      continue;
    if (href.startsWith("/"))
      href = `${BASE_URL62}${href}#downloads`;
    pos++;
    results.push(makeSearchResult({
      title,
      url: href,
      snippet: "Android APK download",
      engine: "apkmirror",
      position: pos,
      category: "general"
    }));
  }
  return results;
}

// src/search/engines/fyyd.ts
var API_URL44 = "https://api.fyyd.de/0.2/search/podcast";
var USER_AGENT145 = "opencode-search/1.0";
function makeFyyd(config) {
  return {
    name: config.name,
    config,
    search: (http, query, opts) => searchFyyd(http, query, opts.numResults || config.maxResults, config.timeout)
  };
}
function searchFyyd(http, query, numResults, timeout3) {
  return exports_Effect.gen(function* () {
    const params = new URLSearchParams({
      term: query,
      count: String(Math.min(numResults, 20)),
      page: "0"
    });
    const response = yield* http.execute(exports_HttpClientRequest.get(`${API_URL44}?${params.toString()}`).pipe(exports_HttpClientRequest.setHeaders({
      "User-Agent": USER_AGENT145,
      Accept: "application/json"
    }))).pipe(exports_Effect.timeout(timeout3));
    if (response.status < 200 || response.status >= 400)
      return [];
    const raw2 = yield* response.text;
    if (!raw2)
      return [];
    return parseFyydResults(raw2, numResults);
  });
}
function parseFyydResults(raw2, maxResults) {
  let parsed;
  try {
    parsed = JSON.parse(raw2);
  } catch {
    return [];
  }
  const data = parsed;
  const podcasts = data?.data;
  if (!Array.isArray(podcasts))
    return [];
  const results = [];
  let pos = 0;
  for (const podcast of podcasts) {
    if (results.length >= maxResults)
      break;
    if (!podcast.title || !podcast.htmlURL)
      continue;
    const epCount = podcast.episode_count ? `${podcast.episode_count} episodes` : "";
    const rank = podcast.rank ? `Rank: ${podcast.rank}` : "";
    const snippet = [rank, epCount, podcast.description?.slice(0, 200)].filter(Boolean).join(" || ");
    pos++;
    results.push(makeSearchResult({
      title: podcast.title,
      url: podcast.htmlURL,
      snippet: snippet.slice(0, 300),
      engine: "fyyd",
      position: pos,
      category: "general"
    }));
  }
  return results;
}

// src/search/engines/scanr.ts
var API_URL45 = "https://scanr.enseignementsup-recherche.gouv.fr/api/structures/search";
var WEB_URL5 = "https://scanr.enseignementsup-recherche.gouv.fr";
var USER_AGENT146 = "opencode-search/1.0";
function makeScanr(config) {
  return {
    name: config.name,
    config,
    search: (http, query, opts) => searchScanr(http, query, opts.numResults || config.maxResults, config.timeout)
  };
}
function searchScanr(http, query, numResults, timeout3) {
  return exports_Effect.gen(function* () {
    const body = JSON.stringify({
      query,
      searchField: "ALL",
      sortDirection: "ASC",
      sortOrder: "RELEVANCY",
      page: 1,
      pageSize: Math.min(numResults, 20)
    });
    const response = yield* http.execute(exports_HttpClientRequest.post(API_URL45).pipe(exports_HttpClientRequest.setHeaders({
      "User-Agent": USER_AGENT146,
      "Content-Type": "application/json",
      Accept: "application/json"
    }), exports_HttpClientRequest.bodyText(body))).pipe(exports_Effect.timeout(timeout3));
    if (response.status < 200 || response.status >= 400)
      return [];
    const raw2 = yield* response.text;
    if (!raw2)
      return [];
    return parseScanrResults(raw2, numResults);
  });
}
function parseScanrResults(raw2, maxResults) {
  let parsed;
  try {
    parsed = JSON.parse(raw2);
  } catch {
    return [];
  }
  const data = parsed;
  const results_arr = data?.results;
  if (!Array.isArray(results_arr) || (data.total ?? 0) < 1)
    return [];
  const results = [];
  let pos = 0;
  for (const item of results_arr) {
    if (results.length >= maxResults)
      break;
    if (!item.id || !item.label)
      continue;
    const snippet = item.highlights?.[0]?.value?.replace(/<[^>]+>/g, "").slice(0, 300) || "French research structure";
    pos++;
    results.push(makeSearchResult({
      title: item.label,
      url: `${WEB_URL5}structure/${item.id}`,
      snippet,
      engine: "scanr",
      position: pos,
      category: "academic"
    }));
  }
  return results;
}

// src/search/engines/smzdm.ts
var USER_AGENT147 = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36";
var SMZDM_SEARCH_URL = "https://search.smzdm.com";
var DDG_HTML_URL2 = "https://html.duckduckgo.com/html/";
function makeSmzdm(config) {
  return {
    name: config.name,
    config,
    search: (http, query, opts) => searchSmzdm(http, query, opts.numResults || config.maxResults, config.timeout)
  };
}
function searchSmzdm(http, query, numResults, timeout3) {
  return exports_Effect.gen(function* () {
    const ddgResults = yield* searchViaDdg(http, query, numResults, timeout3);
    const directResults = yield* searchDirectSmzdm(http, query, numResults, timeout3);
    const combined = [...directResults];
    const seenUrls = new Set(combined.map((r) => r.url));
    for (const r of ddgResults) {
      if (!seenUrls.has(r.url) && combined.length < numResults) {
        seenUrls.add(r.url);
        combined.push(r);
      }
    }
    return combined.slice(0, numResults);
  });
}
function searchViaDdg(http, query, numResults, timeout3) {
  return exports_Effect.gen(function* () {
    const scopedQuery = `site:smzdm.com ${query} 优惠`;
    const formData2 = new URLSearchParams({ q: scopedQuery, b: "", kl: "wt-wt" });
    const response = yield* http.execute(exports_HttpClientRequest.post(DDG_HTML_URL2).pipe(exports_HttpClientRequest.setHeaders({
      "User-Agent": USER_AGENT147,
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8"
    }), exports_HttpClientRequest.bodyText(formData2.toString()))).pipe(exports_Effect.timeout(timeout3));
    if (response.status < 200 || response.status >= 400)
      return [];
    const html = yield* response.text;
    if (html.includes('id="challenge-form"'))
      return [];
    return parseDdgResults(html, Math.ceil(numResults / 2), "smzdm-ddg");
  });
}
function searchDirectSmzdm(http, query, numResults, timeout3) {
  return exports_Effect.gen(function* () {
    const params = new URLSearchParams({
      c: "home",
      v: "home",
      s: query
    });
    const response = yield* http.execute(exports_HttpClientRequest.get(`${SMZDM_SEARCH_URL}/cate-home/0/0/0/0/0/0/0/0/0/0_0_0_0_0_0_0_0_0_0/0_0_0_0_0_0_0_0_0_0_0_0_0_0_0_0_0_0_0_0_0/0_0_0_0_0_0_0_0_0_0_0_0_0_0_0_0_0_0_0_0_0/0_0_0_?${params.toString()}`).pipe(exports_HttpClientRequest.setHeaders({
      "User-Agent": USER_AGENT147,
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
      Referer: "https://www.smzdm.com/"
    }))).pipe(exports_Effect.timeout(timeout3));
    if (response.status < 200 || response.status >= 400)
      return [];
    const html = yield* response.text;
    if (!html || html.length < 100)
      return [];
    return parseSmzdmDirectResults(html, Math.ceil(numResults / 2));
  }).pipe(exports_Effect.catchIf(() => true, () => exports_Effect.succeed([])));
}
function parseDdgResults(html, maxResults, engineName) {
  const results = [];
  let pos = 0;
  const resultRegex = /<a[^>]*class="[^"]*result__a[^"]*"[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<a[^>]*class="[^"]*result__snippet[^"]*"[^>]*>([\s\S]*?)<\/a>/gi;
  let match6;
  while ((match6 = resultRegex.exec(html)) !== null) {
    if (results.length >= maxResults)
      break;
    let url = match6[1].trim();
    const uddgMatch = url.match(/[?&]uddg=([^&]+)/);
    if (uddgMatch) {
      try {
        url = decodeURIComponent(uddgMatch[1]);
      } catch {}
    }
    const title = match6[2].replace(/<[^>]+>/g, "").trim();
    const snippet = match6[3].replace(/<[^>]+>/g, "").trim();
    if (!title || !url)
      continue;
    pos++;
    results.push(makeSearchResult({
      title,
      url,
      snippet: `${snippet} · 什么值得买`,
      engine: engineName,
      position: pos,
      category: "shopping"
    }));
  }
  return results;
}
function parseSmzdmDirectResults(html, maxResults) {
  const results = [];
  let pos = 0;
  const itemRegex = /<li[^>]*class="[^"]*feed-list-item[^"]*"[^>]*data-articleid="(\d+)"[^>]*>[\s\S]*?<h5[^>]*class="[^"]*feed-block-title[^"]*"[^>]*>[\s\S]*?<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<div[^>]*class="[^"]*z-highlight[^"]*"[^>]*>([\s\S]*?)<\/div>[\s\S]*?<div[^>]*class="[^"]*price[^"]*"[^>]*>([\s\S]*?)<\/div>/gi;
  let match6;
  while ((match6 = itemRegex.exec(html)) !== null) {
    if (results.length >= maxResults)
      break;
    const articleId = match6[1];
    let url = match6[2].trim();
    const title = match6[3].replace(/<[^>]+>/g, "").trim();
    const priceBlock = match6[5]?.replace(/<[^>]+>/g, "").trim() ?? "";
    if (!url.startsWith("http")) {
      url = `https://www.smzdm.com${url.startsWith("/") ? "" : "/"}${url}`;
    }
    if (!title)
      continue;
    pos++;
    results.push(makeSearchResult({
      title,
      url,
      snippet: priceBlock ? `${priceBlock} · 什么值得买` : "什么值得买",
      engine: "smzdm",
      position: pos,
      category: "shopping",
      publishedDate: articleId ? parseInt(articleId, 10) : undefined
    }));
  }
  if (results.length === 0) {
    const fallbackRegex = /<a[^>]*href="(https?:\/\/[^"]*smzdm\.com[^"]*)"[^>]*>([\s\S]*?)<\/a>/gi;
    while ((match6 = fallbackRegex.exec(html)) !== null) {
      if (results.length >= maxResults)
        break;
      const url = match6[1];
      const title = match6[2].replace(/<[^>]+>/g, "").trim();
      if (!title || title.length < 5)
        continue;
      pos++;
      results.push(makeSearchResult({
        title,
        url,
        snippet: "什么值得买",
        engine: "smzdm",
        position: pos,
        category: "shopping"
      }));
    }
  }
  return results;
}

// src/search/engines/site-search.ts
var USER_AGENT148 = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36";
var DDG_HTML_URL3 = "https://html.duckduckgo.com/html/";
function searchSiteViaDdg(http, domain, query, suffix, numResults, timeout3) {
  return exports_Effect.gen(function* () {
    const scopedQuery = `site:${domain} ${query} ${suffix}`;
    const formData2 = new URLSearchParams({ q: scopedQuery, b: "", kl: "wt-wt" });
    const response = yield* http.execute(exports_HttpClientRequest.post(DDG_HTML_URL3).pipe(exports_HttpClientRequest.setHeaders({
      "User-Agent": USER_AGENT148,
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8"
    }), exports_HttpClientRequest.bodyText(formData2.toString()))).pipe(exports_Effect.timeout(timeout3));
    if (response.status < 200 || response.status >= 400)
      return [];
    const html = yield* response.text;
    if (html.includes('id="challenge-form"'))
      return [];
    return parseDdgSiteResults(html, numResults, domain);
  });
}
function searchSiteViaDdgGeneric(http, domain, query, suffix, numResults, timeout3) {
  return exports_Effect.gen(function* () {
    const genericQuery = `${query} ${suffix}`;
    const formData2 = new URLSearchParams({ q: genericQuery, b: "", kl: "cn-zh" });
    const response = yield* http.execute(exports_HttpClientRequest.post(DDG_HTML_URL3).pipe(exports_HttpClientRequest.setHeaders({
      "User-Agent": USER_AGENT148,
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8"
    }), exports_HttpClientRequest.bodyText(formData2.toString()))).pipe(exports_Effect.timeout(timeout3));
    if (response.status < 200 || response.status >= 400)
      return [];
    const html = yield* response.text;
    if (html.includes('id="challenge-form"'))
      return [];
    return parseDdgSiteResults(html, numResults, domain);
  });
}
function searchSiteWithFallback(http, domain, query, suffix, numResults, timeout3, engine, label) {
  return exports_Effect.gen(function* () {
    const primary = yield* searchSiteViaDdg(http, domain, query, suffix, numResults, timeout3);
    if (primary.length >= numResults) {
      return [...primary].map(labelResult(engine, label));
    }
    const combined = [...primary];
    const seen = new Set(combined.map((r) => r.url));
    const altResults = yield* searchAltSiteOrder(http, domain, query, suffix, numResults, timeout3);
    for (const r of altResults) {
      if (!seen.has(r.url) && combined.length < numResults) {
        seen.add(r.url);
        combined.push(r);
      }
    }
    if (combined.length >= numResults) {
      return combined.map(labelResult(engine, label));
    }
    const genericResults = yield* searchSiteViaDdgGeneric(http, domain, query, suffix, numResults, timeout3);
    for (const r of genericResults) {
      if (!seen.has(r.url) && combined.length < numResults) {
        seen.add(r.url);
        combined.push(r);
      }
    }
    return combined.map(labelResult(engine, label));
  });
}
function searchAltSiteOrder(http, domain, query, suffix, numResults, timeout3) {
  return exports_Effect.gen(function* () {
    const altQuery = `${query} site:${domain} ${suffix}`;
    const formData2 = new URLSearchParams({ q: altQuery, b: "", kl: "wt-wt" });
    const response = yield* http.execute(exports_HttpClientRequest.post(DDG_HTML_URL3).pipe(exports_HttpClientRequest.setHeaders({
      "User-Agent": USER_AGENT148,
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8"
    }), exports_HttpClientRequest.bodyText(formData2.toString()))).pipe(exports_Effect.timeout(timeout3));
    if (response.status < 200 || response.status >= 400)
      return [];
    const html = yield* response.text;
    if (html.includes('id="challenge-form"'))
      return [];
    return parseDdgSiteResults(html, numResults, domain);
  });
}
function parseDdgSiteResults(html, maxResults, domain) {
  const results = [];
  let pos = 0;
  const resultRegex = /<a[^>]*class="[^"]*result__a[^"]*"[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<a[^>]*class="[^"]*result__snippet[^"]*"[^>]*>([\s\S]*?)<\/a>/gi;
  let match6;
  while ((match6 = resultRegex.exec(html)) !== null) {
    if (results.length >= maxResults)
      break;
    let url = match6[1].trim();
    const uddgMatch = url.match(/[?&]uddg=([^&]+)/);
    if (uddgMatch) {
      try {
        url = decodeURIComponent(uddgMatch[1]);
      } catch {}
    }
    const title = match6[2].replace(/<[^>]+>/g, "").trim();
    const snippet = match6[3].replace(/<[^>]+>/g, "").trim();
    if (!title || !url)
      continue;
    if (!url.includes(domain))
      continue;
    pos++;
    const result3 = makeSearchResult({
      title,
      url,
      snippet,
      engine: "",
      position: pos,
      category: "shopping"
    });
    results.push(result3);
  }
  return results;
}
function labelResult(engine, label) {
  return (r) => ({
    ...r,
    engine,
    snippet: r.snippet ? `${r.snippet} · ${label}` : label
  });
}

// src/search/engines/jd.ts
var DOMAIN = "jd.com";
function makeJd(config) {
  return {
    name: config.name,
    config,
    search: (http, query, opts) => searchJd(http, query, opts.numResults || config.maxResults, config.timeout)
  };
}
function searchJd(http, query, numResults, timeout3) {
  return searchSiteWithFallback(http, DOMAIN, query, "价格", numResults, timeout3, "jd", "京东");
}

// src/search/engines/taobao.ts
var USER_AGENT149 = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36";
var DDG_HTML_URL4 = "https://html.duckduckgo.com/html/";
function makeTaobao(config) {
  return {
    name: config.name,
    config,
    search: (http, query, opts) => searchTaobao(http, query, opts.numResults || config.maxResults, config.timeout)
  };
}
function searchTaobao(http, query, numResults, timeout3) {
  return exports_Effect.gen(function* () {
    const queries = [
      `site:taobao.com ${query} 价格`,
      `site:tmall.com ${query} 价格`
    ];
    const allResults = [];
    const seenUrls = new Set;
    for (const scopedQuery of queries) {
      const formData2 = new URLSearchParams({ q: scopedQuery, b: "", kl: "wt-wt" });
      const html = yield* fetchDdgHtml(http, formData2, timeout3).pipe(exports_Effect.catchIf(() => true, () => exports_Effect.succeed("")));
      if (!html || html.includes('id="challenge-form"'))
        continue;
      const parsed = parseTaobaoResults(html, Math.ceil(numResults / 2));
      for (const r of parsed) {
        if (!seenUrls.has(r.url) && allResults.length < numResults) {
          seenUrls.add(r.url);
          allResults.push(r);
        }
      }
    }
    return allResults.slice(0, numResults);
  });
}
function fetchDdgHtml(http, formData2, timeout3) {
  return exports_Effect.gen(function* () {
    const response = yield* http.execute(exports_HttpClientRequest.post(DDG_HTML_URL4).pipe(exports_HttpClientRequest.setHeaders({
      "User-Agent": USER_AGENT149,
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8"
    }), exports_HttpClientRequest.bodyText(formData2.toString()))).pipe(exports_Effect.timeout(timeout3));
    if (response.status < 200 || response.status >= 400)
      return "";
    return yield* response.text;
  });
}
function parseTaobaoResults(html, maxResults) {
  const results = [];
  let pos = 0;
  const resultRegex = /<a[^>]*class="[^"]*result__a[^"]*"[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<a[^>]*class="[^"]*result__snippet[^"]*"[^>]*>([\s\S]*?)<\/a>/gi;
  let match6;
  while ((match6 = resultRegex.exec(html)) !== null) {
    if (results.length >= maxResults)
      break;
    let url = match6[1].trim();
    const uddgMatch = url.match(/[?&]uddg=([^&]+)/);
    if (uddgMatch) {
      try {
        url = decodeURIComponent(uddgMatch[1]);
      } catch {}
    }
    const title = match6[2].replace(/<[^>]+>/g, "").trim();
    const snippet = match6[3].replace(/<[^>]+>/g, "").trim();
    if (!title || !url)
      continue;
    if (!url.includes("taobao.com") && !url.includes("tmall.com") && !url.includes("taobao."))
      continue;
    pos++;
    const engine = url.includes("tmall.com") ? "tmall" : "taobao";
    results.push(makeSearchResult({
      title,
      url,
      snippet: snippet ? `${snippet} · ${engine === "tmall" ? "天猫" : "淘宝"}` : engine === "tmall" ? "天猫" : "淘宝",
      engine,
      position: pos,
      category: "shopping"
    }));
  }
  return results;
}

// src/search/engines/pdd.ts
var USER_AGENT150 = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36";
var DDG_HTML_URL5 = "https://html.duckduckgo.com/html/";
function makePdd(config) {
  return {
    name: config.name,
    config,
    search: (http, query, opts) => searchPdd(http, query, opts.numResults || config.maxResults, config.timeout)
  };
}
function searchPdd(http, query, numResults, timeout3) {
  return exports_Effect.gen(function* () {
    const scopedQuery = `site:pinduoduo.com OR site:yangkeduo.com ${query} 价格`;
    const formData2 = new URLSearchParams({ q: scopedQuery, b: "", kl: "wt-wt" });
    const response = yield* http.execute(exports_HttpClientRequest.post(DDG_HTML_URL5).pipe(exports_HttpClientRequest.setHeaders({
      "User-Agent": USER_AGENT150,
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8"
    }), exports_HttpClientRequest.bodyText(formData2.toString()))).pipe(exports_Effect.timeout(timeout3));
    if (response.status < 200 || response.status >= 400)
      return [];
    const html = yield* response.text;
    if (html.includes('id="challenge-form"'))
      return [];
    return parsePddResults(html, numResults);
  });
}
function parsePddResults(html, maxResults) {
  const results = [];
  let pos = 0;
  const resultRegex = /<a[^>]*class="[^"]*result__a[^"]*"[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<a[^>]*class="[^"]*result__snippet[^"]*"[^>]*>([\s\S]*?)<\/a>/gi;
  let match6;
  while ((match6 = resultRegex.exec(html)) !== null) {
    if (results.length >= maxResults)
      break;
    let url = match6[1].trim();
    const uddgMatch = url.match(/[?&]uddg=([^&]+)/);
    if (uddgMatch) {
      try {
        url = decodeURIComponent(uddgMatch[1]);
      } catch {}
    }
    const title = match6[2].replace(/<[^>]+>/g, "").trim();
    const snippet = match6[3].replace(/<[^>]+>/g, "").trim();
    if (!title || !url)
      continue;
    if (!url.includes("pinduoduo.com") && !url.includes("yangkeduo.com"))
      continue;
    pos++;
    results.push(makeSearchResult({
      title,
      url,
      snippet: snippet ? `${snippet} · 拼多多` : "拼多多",
      engine: "pdd",
      position: pos,
      category: "shopping"
    }));
  }
  return results;
}

// src/search/engines/amazon-cn.ts
var USER_AGENT151 = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36";
var DDG_HTML_URL6 = "https://html.duckduckgo.com/html/";
function makeAmazonCn(config) {
  return {
    name: config.name,
    config,
    search: (http, query, opts) => searchAmazonCn(http, query, opts.numResults || config.maxResults, config.timeout)
  };
}
function searchAmazonCn(http, query, numResults, timeout3) {
  return exports_Effect.gen(function* () {
    const scopedQuery = `site:amazon.cn ${query} 价格`;
    const formData2 = new URLSearchParams({ q: scopedQuery, b: "", kl: "wt-wt" });
    const response = yield* http.execute(exports_HttpClientRequest.post(DDG_HTML_URL6).pipe(exports_HttpClientRequest.setHeaders({
      "User-Agent": USER_AGENT151,
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8"
    }), exports_HttpClientRequest.bodyText(formData2.toString()))).pipe(exports_Effect.timeout(timeout3));
    if (response.status < 200 || response.status >= 400)
      return [];
    const html = yield* response.text;
    if (html.includes('id="challenge-form"'))
      return [];
    return parseAmazonCnResults(html, numResults);
  });
}
function parseAmazonCnResults(html, maxResults) {
  const results = [];
  let pos = 0;
  const resultRegex = /<a[^>]*class="[^"]*result__a[^"]*"[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<a[^>]*class="[^"]*result__snippet[^"]*"[^>]*>([\s\S]*?)<\/a>/gi;
  let match6;
  while ((match6 = resultRegex.exec(html)) !== null) {
    if (results.length >= maxResults)
      break;
    let url = match6[1].trim();
    const uddgMatch = url.match(/[?&]uddg=([^&]+)/);
    if (uddgMatch) {
      try {
        url = decodeURIComponent(uddgMatch[1]);
      } catch {}
    }
    const title = match6[2].replace(/<[^>]+>/g, "").trim();
    const snippet = match6[3].replace(/<[^>]+>/g, "").trim();
    if (!title || !url)
      continue;
    if (!url.includes("amazon.cn") && !url.includes("amazon."))
      continue;
    pos++;
    results.push(makeSearchResult({
      title,
      url,
      snippet: snippet ? `${snippet} · Amazon` : "Amazon.cn",
      engine: "amazon-cn",
      position: pos,
      category: "shopping"
    }));
  }
  return results;
}

// src/search/engines/suning.ts
var DOMAIN2 = "suning.com";
function makeSuning(config) {
  return {
    name: config.name,
    config,
    search: (http, query, opts) => searchSuning(http, query, opts.numResults || config.maxResults, config.timeout)
  };
}
function searchSuning(http, query, numResults, timeout3) {
  return searchSiteWithFallback(http, DOMAIN2, query, "价格", numResults, timeout3, "suning", "苏宁易购");
}

// src/search/engines/gome.ts
var DOMAIN3 = "gome.com.cn";
function makeGome(config) {
  return {
    name: config.name,
    config,
    search: (http, query, opts) => searchGome(http, query, opts.numResults || config.maxResults, config.timeout)
  };
}
function searchGome(http, query, numResults, timeout3) {
  return searchSiteWithFallback(http, DOMAIN3, query, "价格", numResults, timeout3, "gome", "国美");
}

// src/search/engines/amazon-us.ts
var USER_AGENT152 = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36";
var DDG_HTML_URL7 = "https://html.duckduckgo.com/html/";
function makeAmazonUs(config) {
  return {
    name: config.name,
    config,
    search: (http, query, opts) => searchAmazonUs(http, query, opts.numResults || config.maxResults, config.timeout)
  };
}
function searchAmazonUs(http, query, numResults, timeout3) {
  return exports_Effect.gen(function* () {
    const scopedQuery = `site:amazon.com ${query} -site:amazon.cn -site:amazon.de -site:amazon.co.uk -site:amazon.co.jp -site:amazon.in -site:amazon.it -site:amazon.es -site:amazon.fr -site:amazon.ca -site:amazon.com.au -site:amazon.com.br -site:amazon.com.mx`;
    const formData2 = new URLSearchParams({ q: scopedQuery, b: "", kl: "wt-wt" });
    const response = yield* http.execute(exports_HttpClientRequest.post(DDG_HTML_URL7).pipe(exports_HttpClientRequest.setHeaders({
      "User-Agent": USER_AGENT152,
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9,zh-CN;q=0.8"
    }), exports_HttpClientRequest.bodyText(formData2.toString()))).pipe(exports_Effect.timeout(timeout3));
    if (response.status < 200 || response.status >= 400)
      return [];
    const html = yield* response.text;
    if (html.includes('id="challenge-form"'))
      return [];
    return parseAmazonUsResults(html, numResults);
  });
}
function parseAmazonUsResults(html, maxResults) {
  const results = [];
  let pos = 0;
  const resultRegex = /<a[^>]*class="[^"]*result__a[^"]*"[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<a[^>]*class="[^"]*result__snippet[^"]*"[^>]*>([\s\S]*?)<\/a>/gi;
  let match6;
  while ((match6 = resultRegex.exec(html)) !== null) {
    if (results.length >= maxResults)
      break;
    let url = match6[1].trim();
    const uddgMatch = url.match(/[?&]uddg=([^&]+)/);
    if (uddgMatch) {
      try {
        url = decodeURIComponent(uddgMatch[1]);
      } catch {}
    }
    const title = match6[2].replace(/<[^>]+>/g, "").trim();
    const snippet = match6[3].replace(/<[^>]+>/g, "").trim();
    if (!title || !url)
      continue;
    if (!url.includes("amazon.com"))
      continue;
    if (url.includes("amazon.cn") || url.includes("amazon.co.") || url.includes("amazon.de") || url.includes("amazon.in") || url.includes("amazon.it") || url.includes("amazon.es") || url.includes("amazon.fr") || url.includes("amazon.ca") || url.includes("amazon.com.au") || url.includes("amazon.com.br") || url.includes("amazon.com.mx") || url.includes("amazon.co.jp"))
      continue;
    pos++;
    results.push(makeSearchResult({
      title,
      url,
      snippet: snippet ? `${snippet} · Amazon.com` : "Amazon.com",
      engine: "amazon-us",
      position: pos,
      category: "shopping"
    }));
  }
  return results;
}

// src/search/engines/vip.ts
var DOMAIN4 = "vip.com";
function makeVip(config) {
  return {
    name: config.name,
    config,
    search: (http, query, opts) => searchVip(http, query, opts.numResults || config.maxResults, config.timeout)
  };
}
function searchVip(http, query, numResults, timeout3) {
  return searchSiteWithFallback(http, DOMAIN4, query, "价格", numResults, timeout3, "vip", "唯品会");
}

// src/search/engines/yipin.ts
var DOMAIN5 = "1688.com";
function makeYipin(config) {
  return {
    name: config.name,
    config,
    search: (http, query, opts) => searchYipin(http, query, opts.numResults || config.maxResults, config.timeout)
  };
}
function searchYipin(http, query, numResults, timeout3) {
  return searchSiteWithFallback(http, DOMAIN5, query, "价格", numResults, timeout3, "1688", "1688批发");
}

// src/search/engines/dangdang.ts
var DOMAIN6 = "dangdang.com";
function makeDangdang(config) {
  return {
    name: config.name,
    config,
    search: (http, query, opts) => searchDangdang(http, query, opts.numResults || config.maxResults, config.timeout)
  };
}
function searchDangdang(http, query, numResults, timeout3) {
  return searchSiteWithFallback(http, DOMAIN6, query, "价格", numResults, timeout3, "dangdang", "当当");
}

// src/search/engines/kaola.ts
var DOMAIN7 = "kaola.com";
function makeKaola(config) {
  return {
    name: config.name,
    config,
    search: (http, query, opts) => searchKaola(http, query, opts.numResults || config.maxResults, config.timeout)
  };
}
function searchKaola(http, query, numResults, timeout3) {
  return searchSiteWithFallback(http, DOMAIN7, query, "价格", numResults, timeout3, "kaola", "考拉海购");
}

// src/search/engines/bbc-news.ts
var USER_AGENT153 = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36";
function makeBbcNews(config) {
  return {
    name: config.name,
    config,
    search: (http, query, opts) => searchBbcNews(http, query, opts.numResults || config.maxResults, config.timeout)
  };
}
function searchBbcNews(http, query, numResults, timeout3) {
  return exports_Effect.gen(function* () {
    const url = `https://www.bbc.co.uk/search?q=${encodeURIComponent(query)}&d=news`;
    const response = yield* http.execute(exports_HttpClientRequest.get(url).pipe(exports_HttpClientRequest.setHeaders({ "User-Agent": USER_AGENT153, Accept: "text/html" }))).pipe(exports_Effect.timeout(timeout3));
    if (response.status < 200 || response.status >= 400)
      return [];
    const html = yield* response.text;
    return parseBbcResults(html, numResults);
  });
}
function parseBbcResults(html, max4) {
  const results = [];
  const re = /<a[^>]*href="(\/news\/[^"]+)"[^>]*>([^<]+)<\/a>/gi;
  let match6;
  let pos = 0;
  while ((match6 = re.exec(html)) !== null && results.length < max4) {
    const path = match6[1];
    const title = match6[2].replace(/<[^>]*>/g, "").trim();
    if (!title || title.length < 5)
      continue;
    pos++;
    results.push(makeSearchResult({
      title,
      url: `https://www.bbc.co.uk${path}`,
      snippet: `BBC News · ${title}`,
      engine: "bbc-news",
      position: pos,
      category: "news"
    }));
  }
  return results;
}

// src/search/engines/theguardian.ts
function makeTheGuardian(config) {
  return {
    name: config.name,
    config,
    search: (http, query, opts) => searchGuardian(http, query, opts.numResults || config.maxResults, config.timeout)
  };
}
function searchGuardian(http, query, numResults, timeout3) {
  return exports_Effect.gen(function* () {
    const key = process.env.GUARDIAN_API_KEY || "test";
    const url = `https://content.guardianapis.com/search?q=${encodeURIComponent(query)}&page-size=${Math.min(numResults, 20)}&api-key=${key}&show-fields=trailText,byline,publication`;
    const response = yield* http.execute(exports_HttpClientRequest.get(url).pipe(exports_HttpClientRequest.setHeaders({ Accept: "application/json" }))).pipe(exports_Effect.timeout(timeout3));
    if (response.status < 200 || response.status >= 400)
      return [];
    const raw2 = yield* response.text;
    if (!raw2)
      return [];
    return parseGuardianResults(raw2, numResults);
  });
}
function parseGuardianResults(raw2, max4) {
  let parsed;
  try {
    parsed = JSON.parse(raw2);
  } catch {
    return [];
  }
  const data = parsed;
  if (!data?.response?.results)
    return [];
  return data.response.results.slice(0, max4).map((r, i) => makeSearchResult({
    title: r.webTitle || "Untitled",
    url: r.webUrl || "",
    snippet: r.fields?.trailText || r.fields?.byline || "The Guardian",
    engine: "theguardian",
    position: i + 1,
    category: "news",
    publishedDate: r.webPublicationDate ? new Date(r.webPublicationDate).getTime() : undefined
  }));
}

// src/search/engines/techcrunch.ts
function makeTechCrunch(config) {
  return {
    name: config.name,
    config,
    search: (http, query, opts) => searchTechCrunch(http, query, opts.numResults || config.maxResults, config.timeout)
  };
}
function searchTechCrunch(http, query, numResults, timeout3) {
  return exports_Effect.gen(function* () {
    const url = `https://techcrunch.com/wp-json/wp/v2/posts?search=${encodeURIComponent(query)}&per_page=${Math.min(numResults, 20)}&_embed`;
    const response = yield* http.execute(exports_HttpClientRequest.get(url).pipe(exports_HttpClientRequest.setHeaders({ Accept: "application/json" }))).pipe(exports_Effect.timeout(timeout3));
    if (response.status < 200 || response.status >= 400)
      return [];
    const raw2 = yield* response.text;
    if (!raw2)
      return [];
    return parseWpResults(raw2, numResults);
  });
}
function parseWpResults(raw2, max4) {
  let parsed;
  try {
    parsed = JSON.parse(raw2);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed))
    return [];
  return parsed.slice(0, max4).map((p, i) => {
    const categories = p._embedded?.["wp:term"]?.[0]?.map((t) => t.name).join(", ") || "";
    return makeSearchResult({
      title: p.title?.rendered?.replace(/<[^>]*>/g, "") || "Untitled",
      url: p.link || "",
      snippet: `${p.excerpt?.rendered?.replace(/<[^>]*>/g, "").slice(0, 150) || ""} · ${categories}`,
      engine: "techcrunch",
      position: i + 1,
      category: "news",
      publishedDate: p.date ? new Date(p.date).getTime() : undefined
    });
  });
}

// src/search/engines/theverge.ts
var USER_AGENT154 = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36";
function makeTheVerge(config) {
  return {
    name: config.name,
    config,
    search: (http, query, opts) => searchTheVerge(http, query, opts.numResults || config.maxResults, config.timeout)
  };
}
function searchTheVerge(http, query, numResults, timeout3) {
  return exports_Effect.gen(function* () {
    const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(`site:theverge.com ${query}`)}`;
    const response = yield* http.execute(exports_HttpClientRequest.get(url).pipe(exports_HttpClientRequest.setHeaders({ "User-Agent": USER_AGENT154, Accept: "text/html" }))).pipe(exports_Effect.timeout(timeout3));
    if (response.status < 200 || response.status >= 400)
      return [];
    const html = yield* response.text;
    return parseDdgResults2(html, numResults);
  });
}
function parseDdgResults2(html, max4) {
  const results = [];
  const resultRe = /class="result__body"[^>]*>[\s\S]*?<a[^>]*href="([^"]+)"[^>]*class="result__a"[^>]*>([^<]+)<\/a>[\s\S]*?<a[^>]*class="result__snippet"[^>]*>([^<]*)</gi;
  let match6;
  let pos = 0;
  while ((match6 = resultRe.exec(html)) !== null && results.length < max4) {
    pos++;
    results.push(makeSearchResult({
      title: match6[2].trim(),
      url: match6[1],
      snippet: match6[3].trim() || "The Verge",
      engine: "theverge",
      position: pos,
      category: "news"
    }));
  }
  return results;
}

// src/search/engines/arstechnica.ts
var USER_AGENT155 = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36";
function makeArsTechnica(config) {
  return {
    name: config.name,
    config,
    search: (http, query, opts) => searchArs(http, query, opts.numResults || config.maxResults, config.timeout)
  };
}
function searchArs(http, query, numResults, timeout3) {
  return exports_Effect.gen(function* () {
    const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(`site:arstechnica.com ${query}`)}`;
    const response = yield* http.execute(exports_HttpClientRequest.get(url).pipe(exports_HttpClientRequest.setHeaders({ "User-Agent": USER_AGENT155, Accept: "text/html" }))).pipe(exports_Effect.timeout(timeout3));
    if (response.status < 200 || response.status >= 400)
      return [];
    const html = yield* response.text;
    return parseDdgResults3(html, numResults);
  });
}
function parseDdgResults3(html, max4) {
  const results = [];
  const resultRe = /class="result__body"[^>]*>[\s\S]*?<a[^>]*href="([^"]+)"[^>]*class="result__a"[^>]*>([^<]+)<\/a>[\s\S]*?<a[^>]*class="result__snippet"[^>]*>([^<]*)</gi;
  let match6;
  let pos = 0;
  while ((match6 = resultRe.exec(html)) !== null && results.length < max4) {
    pos++;
    results.push(makeSearchResult({
      title: match6[2].trim(),
      url: match6[1],
      snippet: match6[3].trim() || "Ars Technica",
      engine: "arstechnica",
      position: pos,
      category: "news"
    }));
  }
  return results;
}

// src/search/engines/yahoo-finance.ts
var USER_AGENT156 = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36";
function makeYahooFinance(config) {
  return {
    name: config.name,
    config,
    search: (http, query, opts) => searchYF(http, query, opts.numResults || config.maxResults, config.timeout)
  };
}
function searchYF(http, query, numResults, timeout3) {
  return exports_Effect.gen(function* () {
    const url = `https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=${numResults}&newsCount=0`;
    const response = yield* http.execute(exports_HttpClientRequest.get(url).pipe(exports_HttpClientRequest.setHeaders({ "User-Agent": USER_AGENT156, Accept: "application/json" }))).pipe(exports_Effect.timeout(timeout3));
    if (response.status < 200 || response.status >= 400)
      return [];
    const raw2 = yield* response.text;
    return parseYfResults(raw2, numResults);
  });
}
function parseYfResults(raw2, max4) {
  let parsed;
  try {
    parsed = JSON.parse(raw2);
  } catch {
    return [];
  }
  const data = parsed;
  if (!data?.quotes)
    return [];
  return data.quotes.slice(0, max4).map((q, i) => {
    const symbol4 = q.symbol || "";
    return makeSearchResult({
      title: `${q.shortname || q.longname || symbol4} (${symbol4})`,
      url: `https://finance.yahoo.com/quote/${encodeURIComponent(symbol4)}`,
      snippet: `${q.exchange || ""} · ${q.quoteType || ""}`,
      engine: "yahoo-finance",
      position: i + 1,
      category: "finance"
    });
  });
}

// src/search/engines/fred.ts
function makeFred(config) {
  return {
    name: config.name,
    config,
    search: (http, query, opts) => searchFred(http, query, opts.numResults || config.maxResults, config.timeout)
  };
}
function searchFred(http, query, numResults, timeout3) {
  return exports_Effect.gen(function* () {
    const key = process.env.FRED_API_KEY || "";
    const keyParam = key ? `&api_key=${key}` : "";
    const url = `https://api.stlouisfed.org/fred/series/search?search_text=${encodeURIComponent(query)}&limit=${numResults}&file_type=json${keyParam}`;
    const response = yield* http.execute(exports_HttpClientRequest.get(url).pipe(exports_HttpClientRequest.setHeaders({ Accept: "application/json" }))).pipe(exports_Effect.timeout(timeout3));
    if (response.status < 200 || response.status >= 400)
      return [];
    const raw2 = yield* response.text;
    return parseFredResults(raw2, numResults);
  });
}
function parseFredResults(raw2, max4) {
  let parsed;
  try {
    parsed = JSON.parse(raw2);
  } catch {
    return [];
  }
  const data = parsed;
  if (!data?.seriess)
    return [];
  return data.seriess.slice(0, max4).map((s, i) => makeSearchResult({
    title: `${s.id}: ${s.title || "Untitled"}`,
    url: `https://fred.stlouisfed.org/series/${s.id || ""}`,
    snippet: `Frequency: ${s.frequency || "N/A"} · Units: ${s.units || "N/A"} · ${s.seasonal_adjustment || ""}`,
    engine: "fred",
    position: i + 1,
    category: "finance"
  }));
}

// src/search/engines/zenodo.ts
function makeZenodo(config) {
  return {
    name: config.name,
    config,
    search: (http, query, opts) => searchZenodo(http, query, opts.numResults || config.maxResults, config.timeout)
  };
}
function searchZenodo(http, query, numResults, timeout3) {
  return exports_Effect.gen(function* () {
    const url = `https://zenodo.org/api/records?q=${encodeURIComponent(query)}&size=${Math.min(numResults, 20)}&sort=bestmatch`;
    const response = yield* http.execute(exports_HttpClientRequest.get(url).pipe(exports_HttpClientRequest.setHeaders({ Accept: "application/json" }))).pipe(exports_Effect.timeout(timeout3));
    if (response.status < 200 || response.status >= 400)
      return [];
    const raw2 = yield* response.text;
    return parseZenodoResults(raw2, numResults);
  });
}
function parseZenodoResults(raw2, max4) {
  let parsed;
  try {
    parsed = JSON.parse(raw2);
  } catch {
    return [];
  }
  const data = parsed;
  const hits = data?.hits?.hits;
  if (!Array.isArray(hits))
    return [];
  return hits.slice(0, max4).map((h, i) => {
    const title = h.metadata?.title || h.title || `ID ${h.id}`;
    const creators = h.metadata?.creators?.map((c) => c.name).join(", ") || "";
    return makeSearchResult({
      title,
      url: h.links?.doi || h.links?.self_html || "",
      snippet: `${creators} · ${h.metadata?.description?.slice(0, 120) || ""}`,
      engine: "zenodo",
      position: i + 1,
      category: "academic",
      publishedDate: h.metadata?.publication_date ? new Date(h.metadata.publication_date).getTime() : undefined
    });
  });
}

// src/search/engines/openfoodfacts.ts
function makeOpenFoodFacts(config) {
  return {
    name: config.name,
    config,
    search: (http, query, opts) => searchOff(http, query, opts.numResults || config.maxResults, config.timeout)
  };
}
function searchOff(http, query, numResults, timeout3) {
  return exports_Effect.gen(function* () {
    const url = `https://world.openfoodfacts.org/api/v2/search?search_terms=${encodeURIComponent(query)}&page_size=${Math.min(numResults, 20)}&json=1`;
    const response = yield* http.execute(exports_HttpClientRequest.get(url).pipe(exports_HttpClientRequest.setHeaders({ Accept: "application/json" }))).pipe(exports_Effect.timeout(timeout3));
    if (response.status < 200 || response.status >= 400)
      return [];
    const raw2 = yield* response.text;
    return parseOffResults(raw2, numResults);
  });
}
function parseOffResults(raw2, max4) {
  let parsed;
  try {
    parsed = JSON.parse(raw2);
  } catch {
    return [];
  }
  const data = parsed;
  if (!data?.products)
    return [];
  return data.products.slice(0, max4).map((p, i) => {
    const categories = (p.categories_tags || []).map((t) => t.replace(/^en:/, "")).slice(0, 3).join(", ");
    return makeSearchResult({
      title: p.product_name || `Product ${p.code || ""}`,
      url: `https://world.openfoodfacts.org/product/${p.code || ""}`,
      snippet: `${p.brands || "Unknown brand"} · Nutri-Score: ${p.nutriscore_grade?.toUpperCase() || "N/A"} · ${categories}`,
      engine: "openfoodfacts",
      position: i + 1,
      category: "general"
    });
  });
}

// src/search/engines/musicbrainz.ts
var USER_AGENT157 = "opencode-search/1.0 ( musicbrainz )";
function makeMusicBrainz(config) {
  return {
    name: config.name,
    config,
    search: (http, query, opts) => searchMb(http, query, opts.numResults || config.maxResults, config.timeout)
  };
}
function searchMb(http, query, numResults, timeout3) {
  return exports_Effect.gen(function* () {
    const url = `https://musicbrainz.org/ws/2/artist/?query=${encodeURIComponent(query)}&limit=${Math.min(numResults, 25)}&fmt=json`;
    const response = yield* http.execute(exports_HttpClientRequest.get(url).pipe(exports_HttpClientRequest.setHeaders({ "User-Agent": USER_AGENT157, Accept: "application/json" }))).pipe(exports_Effect.timeout(timeout3));
    if (response.status < 200 || response.status >= 400)
      return [];
    const raw2 = yield* response.text;
    return parseMbResults(raw2, numResults);
  });
}
function parseMbResults(raw2, max4) {
  let parsed;
  try {
    parsed = JSON.parse(raw2);
  } catch {
    return [];
  }
  const data = parsed;
  if (!data?.artists)
    return [];
  return data.artists.slice(0, max4).map((a, i) => {
    const tags = a.tags?.map((t) => t.name).join(", ") || "";
    const lifespan = a["life-span"]?.begin ? `(${a["life-span"].begin}${a["life-span"]?.end ? `-${a["life-span"].end}` : "-present"})` : "";
    return makeSearchResult({
      title: a.name || "Unknown",
      url: `https://musicbrainz.org/artist/${a.id || ""}`,
      snippet: `${a.type || "Artist"} · ${a.country || ""} · ${tags} ${lifespan}`,
      engine: "musicbrainz",
      position: i + 1,
      category: "music"
    });
  });
}

// src/search/engines/ads.ts
function makeAds(config) {
  return {
    name: config.name,
    config,
    search: (http, query, opts) => searchAds(http, query, opts.numResults || config.maxResults, config.timeout)
  };
}
function searchAds(http, query, numResults, timeout3) {
  return exports_Effect.gen(function* () {
    const key = process.env.ADS_API_KEY || "";
    const url = `https://api.adsabs.harvard.edu/v1/search/query?q=${encodeURIComponent(query)}&rows=${Math.min(numResults, 20)}&fl=title,bibcode,abstract,author,pubdate,citation_count`;
    const headers = { Accept: "application/json" };
    if (key)
      headers["Authorization"] = `Bearer ${key}`;
    const response = yield* http.execute(exports_HttpClientRequest.get(url).pipe(exports_HttpClientRequest.setHeaders(headers))).pipe(exports_Effect.timeout(timeout3));
    if (response.status < 200 || response.status >= 400)
      return [];
    const raw2 = yield* response.text;
    return parseAdsResults(raw2, numResults);
  });
}
function parseAdsResults(raw2, max4) {
  let parsed;
  try {
    parsed = JSON.parse(raw2);
  } catch {
    return [];
  }
  const data = parsed;
  if (!data?.response?.docs)
    return [];
  return data.response.docs.slice(0, max4).map((d, i) => {
    const authors = (d.author || []).slice(0, 3).join(", ") + (d.author && d.author.length > 3 ? " et al." : "");
    return makeSearchResult({
      title: (d.title || ["Untitled"])[0],
      url: `https://ui.adsabs.harvard.edu/abs/${d.bibcode || ""}/abstract`,
      snippet: `${authors} · ${d.pubdate || ""} · ${d.citation_count || 0} citations`,
      engine: "ads",
      position: i + 1,
      category: "academic",
      publishedDate: d.pubdate ? new Date(d.pubdate).getTime() : undefined
    });
  });
}

// src/search/engines/igdb.ts
function makeIgdb(config) {
  return {
    name: config.name,
    config,
    search: (http, query, opts) => searchIgdb(http, query, opts.numResults || config.maxResults, config.timeout)
  };
}
function searchIgdb(http, query, numResults, timeout3) {
  return exports_Effect.gen(function* () {
    const clientId = process.env.TWITCH_CLIENT_ID || "";
    const accessToken = process.env.TWITCH_ACCESS_TOKEN || "";
    if (!clientId || !accessToken)
      return [];
    const url = "https://api.igdb.com/v4/games";
    const body = `search "${query}"; fields name,summary,url,first_release_date,rating; limit ${numResults};`;
    const response = yield* http.execute(exports_HttpClientRequest.post(url).pipe(exports_HttpClientRequest.setHeaders({
      "Client-ID": clientId,
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json"
    }), exports_HttpClientRequest.setBody(body))).pipe(exports_Effect.timeout(timeout3));
    if (response.status < 200 || response.status >= 400)
      return [];
    const raw2 = yield* response.text;
    return parseIgdbResults(raw2, numResults);
  });
}
function parseIgdbResults(raw2, max4) {
  let parsed;
  try {
    parsed = JSON.parse(raw2);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed))
    return [];
  return parsed.slice(0, max4).map((g, i) => {
    const release = g.first_release_date ? new Date(g.first_release_date * 1000).getFullYear() : "";
    return makeSearchResult({
      title: g.name || `Game ${g.id}`,
      url: g.url || `https://www.igdb.com/games/${g.id || ""}`,
      snippet: `${g.summary?.slice(0, 120) || ""} · ${release} · ⭐${g.rating?.toFixed(0) || "?"}/100`,
      engine: "igdb",
      position: i + 1,
      category: "game",
      publishedDate: g.first_release_date ? g.first_release_date * 1000 : undefined
    });
  });
}

// src/search/engines/rawg.ts
function makeRawg(config) {
  return {
    name: config.name,
    config,
    search: (http, query, opts) => searchRawg(http, query, opts.numResults || config.maxResults, config.timeout)
  };
}
function searchRawg(http, query, numResults, timeout3) {
  return exports_Effect.gen(function* () {
    const key = process.env.RAWG_API_KEY || "";
    const url = `https://api.rawg.io/api/games?search=${encodeURIComponent(query)}&page_size=${Math.min(numResults, 20)}${key ? `&key=${key}` : ""}`;
    const response = yield* http.execute(exports_HttpClientRequest.get(url).pipe(exports_HttpClientRequest.setHeaders({ Accept: "application/json" }))).pipe(exports_Effect.timeout(timeout3));
    if (response.status < 200 || response.status >= 400)
      return [];
    const raw2 = yield* response.text;
    return parseRawgResults(raw2, numResults);
  });
}
function parseRawgResults(raw2, max4) {
  let parsed;
  try {
    parsed = JSON.parse(raw2);
  } catch {
    return [];
  }
  const data = parsed;
  if (!data?.results)
    return [];
  return data.results.slice(0, max4).map((g, i) => {
    const genres = g.genres?.map((x) => x.name).join(", ") || "";
    const platforms = g.platforms?.map((p) => p.platform.name).slice(0, 3).join(", ") || "";
    return makeSearchResult({
      title: g.name || `Game ${g.id}`,
      url: `https://rawg.io/games/${g.id || g.name?.toLowerCase().replace(/\s+/g, "-")}`,
      snippet: `${g.released || ""} · ⭐${g.rating?.toFixed(1) || "?"} · Metacritic ${g.metacritic || "?"} · ${genres} · ${platforms}`,
      engine: "rawg",
      position: i + 1,
      category: "game",
      publishedDate: g.released ? new Date(g.released).getTime() : undefined
    });
  });
}

// src/search/engines/tvmaze.ts
function makeTvMaze(config) {
  return {
    name: config.name,
    config,
    search: (http, query, opts) => searchTvMaze(http, query, opts.numResults || config.maxResults, config.timeout)
  };
}
function searchTvMaze(http, query, numResults, timeout3) {
  return exports_Effect.gen(function* () {
    const url = `https://api.tvmaze.com/search/shows?q=${encodeURIComponent(query)}`;
    const response = yield* http.execute(exports_HttpClientRequest.get(url).pipe(exports_HttpClientRequest.setHeaders({ Accept: "application/json" }))).pipe(exports_Effect.timeout(timeout3));
    if (response.status < 200 || response.status >= 400)
      return [];
    const raw2 = yield* response.text;
    return parseTvMazeResults(raw2, numResults);
  });
}
function parseTvMazeResults(raw2, max4) {
  let parsed;
  try {
    parsed = JSON.parse(raw2);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed))
    return [];
  return parsed.slice(0, max4).map((item, i) => {
    const show = item.show;
    if (!show)
      return makeSearchResult({ title: "", url: "", snippet: "", engine: "tvmaze", position: 0, category: "entertainment" });
    const network = show.network?.name || show.webChannel?.name || "";
    const genres = show.genres?.join(", ") || "";
    return makeSearchResult({
      title: show.name || "Unknown",
      url: show.url || `https://www.tvmaze.com/shows/${show.id || ""}`,
      snippet: `${network} · ${show.status || ""} · ${genres} · ⭐${show.rating?.average?.toFixed(1) || "?"} · ${show.premiered || ""}`,
      engine: "tvmaze",
      position: i + 1,
      category: "entertainment",
      publishedDate: show.premiered ? new Date(show.premiered).getTime() : undefined
    });
  });
}

// src/search/engines/openweather.ts
function makeOpenWeather(config) {
  return {
    name: config.name,
    config,
    search: (http, query, opts) => searchOwm(http, query, opts.numResults || config.maxResults, config.timeout)
  };
}
function searchOwm(http, query, numResults, timeout3) {
  return exports_Effect.gen(function* () {
    const key = process.env.OPENWEATHER_API_KEY || "";
    if (!key)
      return [];
    const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(query)}&appid=${key}&units=metric&lang=zh_cn`;
    const response = yield* http.execute(exports_HttpClientRequest.get(url).pipe(exports_HttpClientRequest.setHeaders({ Accept: "application/json" }))).pipe(exports_Effect.timeout(timeout3));
    if (response.status < 200 || response.status >= 400)
      return [];
    const raw2 = yield* response.text;
    return parseOwmResults(raw2, numResults);
  });
}
function parseOwmResults(raw2, max4) {
  let parsed;
  try {
    parsed = JSON.parse(raw2);
  } catch {
    return [];
  }
  const data = parsed;
  if (!data?.name)
    return [];
  const weather = data.weather?.[0];
  const main = data.main;
  return [makeSearchResult({
    title: `${data.name}, ${data.sys?.country || ""} · ${weather?.description || ""}`,
    url: `https://openweathermap.org/city/${encodeURIComponent(data.name)}`,
    snippet: `\uD83C\uDF21 ${main?.temp?.toFixed(0) || "?"}°C (feels ${main?.feels_like?.toFixed(0) || "?"}°) · Min ${main?.temp_min?.toFixed(0) || "?"}° / Max ${main?.temp_max?.toFixed(0) || "?"}° · Humidity ${main?.humidity || "?"}% · Wind ${data.wind?.speed || "?"} m/s`,
    engine: "openweather",
    position: 1,
    category: "weather"
  })].slice(0, max4);
}

// src/search/selector.ts
function selectEngines(flags) {
  const engines = [];
  engines.push(makeDuckDuckGo(makeEngineConfig({
    name: "duckduckgo",
    weight: 1,
    timeout: exports_Duration.toMillis(exports_Duration.seconds(15)),
    maxResults: 50
  })));
  engines.push(makeBing(makeEngineConfig({
    name: "bing",
    weight: 0.9,
    timeout: exports_Duration.toMillis(exports_Duration.seconds(15)),
    maxResults: 50,
    priority: 1,
    requiresKey: false
  })));
  const hasBraveKey = !!process.env.BRAVE_API_KEY;
  if (flags?.brave || hasBraveKey || !flags) {
    engines.push(makeBrave(makeEngineConfig({
      name: "brave",
      weight: 1.2,
      timeout: exports_Duration.toMillis(exports_Duration.seconds(15)),
      maxResults: 50,
      priority: 1,
      requiresKey: false
    })));
  }
  if (!flags) {
    engines.push(makeStartpage(makeEngineConfig({
      name: "startpage",
      weight: 1.1,
      timeout: exports_Duration.toMillis(exports_Duration.seconds(15)),
      maxResults: 50,
      priority: 1,
      requiresKey: false
    })));
  }
  if (!flags) {
    engines.push(makeMwmbl(makeEngineConfig({
      name: "mwmbl",
      weight: 0.7,
      timeout: exports_Duration.toMillis(exports_Duration.seconds(15)),
      maxResults: 5,
      priority: 0,
      requiresKey: false
    })));
  }
  if (!flags) {
    engines.push(makeSeznam(makeEngineConfig({
      name: "seznam",
      weight: 0.7,
      timeout: exports_Duration.toMillis(exports_Duration.seconds(15)),
      maxResults: 5,
      priority: 0,
      requiresKey: false
    })));
  }
  if (!flags) {
    engines.push(makeAol(makeEngineConfig({
      name: "aol",
      weight: 0.7,
      timeout: exports_Duration.toMillis(exports_Duration.seconds(15)),
      maxResults: 5,
      priority: 0,
      requiresKey: false
    })));
  }
  if (!flags) {
    engines.push(makeGmx(makeEngineConfig({
      name: "gmx",
      weight: 0.7,
      timeout: exports_Duration.toMillis(exports_Duration.seconds(15)),
      maxResults: 5,
      priority: 0,
      requiresKey: false
    })));
  }
  if (!flags) {
    engines.push(makeYep(makeEngineConfig({
      name: "yep",
      weight: 0.7,
      timeout: exports_Duration.toMillis(exports_Duration.seconds(15)),
      maxResults: 5,
      priority: 0,
      requiresKey: false
    })));
  }
  if (!flags) {
    engines.push(makeMojeek(makeEngineConfig({
      name: "mojeek",
      weight: 0.6,
      timeout: exports_Duration.toMillis(exports_Duration.seconds(15)),
      maxResults: 5,
      priority: 0,
      requiresKey: false
    })));
  }
  if (!flags) {
    engines.push(makeGrokipedia(makeEngineConfig({
      name: "grokipedia",
      weight: 0.5,
      timeout: exports_Duration.toMillis(exports_Duration.seconds(15)),
      maxResults: 5,
      priority: 0,
      requiresKey: false
    })));
  }
  if (flags?.bilibili || !flags || flags?.queryType === "video") {
    engines.push(makeBilibili(makeEngineConfig({
      name: "bilibili",
      weight: 1,
      timeout: exports_Duration.toMillis(exports_Duration.seconds(15)),
      maxResults: 5,
      priority: 0
    })));
  }
  if (!flags || flags?.queryType === "video") {
    engines.push(makeYouTube(makeEngineConfig({
      name: "youtube",
      weight: 1.2,
      timeout: exports_Duration.toMillis(exports_Duration.seconds(20)),
      maxResults: 50,
      priority: 2,
      requiresKey: false
    })));
  }
  if (!flags || flags?.queryType === "video") {
    engines.push(makePiped(makeEngineConfig({
      name: "piped",
      weight: 0.9,
      timeout: exports_Duration.toMillis(exports_Duration.seconds(20)),
      maxResults: 5,
      priority: 1,
      requiresKey: false
    })));
  }
  if (!flags || flags?.queryType === "video") {
    engines.push(makeInvidious(makeEngineConfig({
      name: "invidious",
      weight: 0.8,
      timeout: exports_Duration.toMillis(exports_Duration.seconds(20)),
      maxResults: 5,
      priority: 0,
      requiresKey: false
    })));
  }
  if (!flags || flags?.queryType === "video") {
    engines.push(makeOdysee(makeEngineConfig({
      name: "odysee",
      weight: 0.7,
      timeout: exports_Duration.toMillis(exports_Duration.seconds(20)),
      maxResults: 5,
      priority: 0,
      requiresKey: false
    })));
  }
  if (!flags || flags?.queryType === "video") {
    engines.push(makeBitchute(makeEngineConfig({
      name: "bitchute",
      weight: 0.5,
      timeout: exports_Duration.toMillis(exports_Duration.seconds(15)),
      maxResults: 5,
      priority: 0,
      requiresKey: false
    })));
  }
  if (!flags || flags?.queryType === "video") {
    engines.push(makeAcfun(makeEngineConfig({
      name: "acfun",
      weight: 0.5,
      timeout: exports_Duration.toMillis(exports_Duration.seconds(15)),
      maxResults: 5,
      priority: 0,
      requiresKey: false
    })));
  }
  if (!flags || flags?.queryType === "video") {
    engines.push(makeIqiyi(makeEngineConfig({
      name: "iqiyi",
      weight: 0.5,
      timeout: exports_Duration.toMillis(exports_Duration.seconds(15)),
      maxResults: 5,
      priority: 0,
      requiresKey: false
    })));
  }
  if (!flags || flags?.queryType === "video") {
    engines.push(makeSogouVideos(makeEngineConfig({
      name: "sogou-videos",
      weight: 0.5,
      timeout: exports_Duration.toMillis(exports_Duration.seconds(15)),
      maxResults: 5,
      priority: 0,
      requiresKey: false
    })));
  }
  if (!flags || flags?.queryType === "news" || flags?.queryType === "social") {
    engines.push(makeSogouWeChat(makeEngineConfig({
      name: "sogou-wechat",
      weight: 0.9,
      timeout: exports_Duration.toMillis(exports_Duration.seconds(15)),
      maxResults: 5,
      priority: 0,
      requiresKey: false
    })));
  }
  if (!flags || flags?.lang?.startsWith("zh")) {
    engines.push(makeBaidu(makeEngineConfig({
      name: "baidu",
      weight: 0.9,
      timeout: exports_Duration.toMillis(exports_Duration.seconds(15)),
      maxResults: 50,
      priority: 1,
      requiresKey: false
    })));
  }
  if (!flags || flags?.lang?.startsWith("zh")) {
    engines.push(makeChinaso(makeEngineConfig({
      name: "chinaso",
      weight: 0.8,
      timeout: exports_Duration.toMillis(exports_Duration.seconds(15)),
      maxResults: 5,
      priority: 0,
      requiresKey: false
    })));
  }
  if (!flags || flags?.lang?.startsWith("zh")) {
    engines.push(makeQuark(makeEngineConfig({
      name: "quark",
      weight: 0.7,
      timeout: exports_Duration.toMillis(exports_Duration.seconds(15)),
      maxResults: 5,
      priority: 0,
      requiresKey: false
    })));
  }
  if (!flags) {
    engines.push(makeGoogle(makeEngineConfig({
      name: "google",
      weight: 1.3,
      timeout: exports_Duration.toMillis(exports_Duration.seconds(20)),
      maxResults: 50,
      priority: 2,
      requiresKey: false
    })));
  }
  if (!flags) {
    engines.push(makeYandex(makeEngineConfig({
      name: "yandex",
      weight: 0.7,
      timeout: exports_Duration.toMillis(exports_Duration.seconds(15)),
      maxResults: 5,
      priority: 0,
      requiresKey: false
    })));
  }
  if (!flags) {
    engines.push(makeNaver(makeEngineConfig({
      name: "naver",
      weight: 0.7,
      timeout: exports_Duration.toMillis(exports_Duration.seconds(15)),
      maxResults: 5,
      priority: 0,
      requiresKey: false
    })));
  }
  if (!flags) {
    engines.push(makeSogou(makeEngineConfig({
      name: "sogou",
      weight: 0.8,
      timeout: exports_Duration.toMillis(exports_Duration.seconds(15)),
      maxResults: 5,
      priority: 0,
      requiresKey: false
    })));
  }
  if (!flags) {
    engines.push(make360Search(makeEngineConfig({
      name: "360search",
      weight: 0.7,
      timeout: exports_Duration.toMillis(exports_Duration.seconds(15)),
      maxResults: 5,
      priority: 0,
      requiresKey: false
    })));
  }
  if (!flags) {
    engines.push(makeBingImages(makeEngineConfig({
      name: "bing-images",
      weight: 0.9,
      timeout: exports_Duration.toMillis(exports_Duration.seconds(15)),
      maxResults: 5,
      priority: 0,
      requiresKey: false
    })));
  }
  if (!flags) {
    engines.push(makeSogouImages(makeEngineConfig({
      name: "sogou-images",
      weight: 0.6,
      timeout: exports_Duration.toMillis(exports_Duration.seconds(15)),
      maxResults: 5,
      priority: 0,
      requiresKey: false
    })));
  }
  if (!flags) {
    engines.push(makeBingVideos(makeEngineConfig({
      name: "bing-videos",
      weight: 0.9,
      timeout: exports_Duration.toMillis(exports_Duration.seconds(15)),
      maxResults: 5,
      priority: 0,
      requiresKey: false
    })));
  }
  if (!flags) {
    engines.push(makeDailymotion(makeEngineConfig({
      name: "dailymotion",
      weight: 0.8,
      timeout: exports_Duration.toMillis(exports_Duration.seconds(15)),
      maxResults: 5,
      priority: 0,
      requiresKey: false
    })));
  }
  if (!flags) {
    engines.push(makeVimeo(makeEngineConfig({
      name: "vimeo",
      weight: 0.7,
      timeout: exports_Duration.toMillis(exports_Duration.seconds(15)),
      maxResults: 5,
      priority: 0,
      requiresKey: false
    })));
  }
  if (!flags) {
    engines.push(makeApkMirror(makeEngineConfig({
      name: "apkmirror",
      weight: 0.5,
      timeout: exports_Duration.toMillis(exports_Duration.seconds(15)),
      maxResults: 5,
      priority: 0,
      requiresKey: false
    })));
  }
  if (!flags) {
    engines.push(makeSoundCloud(makeEngineConfig({
      name: "soundcloud",
      weight: 0.7,
      timeout: exports_Duration.toMillis(exports_Duration.seconds(15)),
      maxResults: 5,
      priority: 0,
      requiresKey: false
    })));
  }
  if (!flags) {
    engines.push(makeFlickr(makeEngineConfig({
      name: "flickr",
      weight: 0.7,
      timeout: exports_Duration.toMillis(exports_Duration.seconds(15)),
      maxResults: 5,
      priority: 0,
      requiresKey: false
    })));
  }
  if (!flags) {
    engines.push(makeDouban(makeEngineConfig({
      name: "douban",
      weight: 0.8,
      timeout: exports_Duration.toMillis(exports_Duration.seconds(15)),
      maxResults: 5,
      priority: 0,
      requiresKey: false
    })));
  }
  if (!flags) {
    engines.push(makeWeibo(makeEngineConfig({
      name: "weibo",
      weight: 0.8,
      timeout: exports_Duration.toMillis(exports_Duration.seconds(15)),
      maxResults: 5,
      priority: 0,
      requiresKey: false
    })));
  }
  if (!flags) {
    engines.push(makeZhihu(makeEngineConfig({
      name: "zhihu",
      weight: 0.8,
      timeout: exports_Duration.toMillis(exports_Duration.seconds(15)),
      maxResults: 5,
      priority: 1,
      requiresKey: false
    })));
  }
  if (!flags) {
    engines.push(makeXiaohongshu(makeEngineConfig({
      name: "xiaohongshu",
      weight: 0.7,
      timeout: exports_Duration.toMillis(exports_Duration.seconds(15)),
      maxResults: 5,
      priority: 1,
      requiresKey: false
    })));
  }
  if (!flags) {
    engines.push(makeReddit(makeEngineConfig({
      name: "reddit",
      weight: 0.7,
      timeout: exports_Duration.toMillis(exports_Duration.seconds(15)),
      maxResults: 5,
      priority: 0,
      requiresKey: false
    })));
  }
  if (!flags || flags?.queryType === "social") {
    engines.push(makeTwitter(makeEngineConfig({
      name: "twitter",
      weight: 0.8,
      timeout: exports_Duration.toMillis(exports_Duration.seconds(20)),
      maxResults: 5,
      priority: 0,
      requiresKey: false
    })));
  }
  if (!flags) {
    engines.push(makeGoogleImages(makeEngineConfig({
      name: "google-images",
      weight: 1,
      timeout: exports_Duration.toMillis(exports_Duration.seconds(20)),
      maxResults: 5,
      priority: 1,
      requiresKey: false
    })));
  }
  if (!flags || flags?.queryType === "academic") {
    engines.push(makeArxiv(makeEngineConfig({
      name: "arxiv",
      weight: 1,
      timeout: exports_Duration.toMillis(exports_Duration.seconds(15)),
      maxResults: 5,
      priority: 1,
      requiresKey: false
    })));
    engines.push(makeSemanticScholar(makeEngineConfig({
      name: "semantic-scholar",
      weight: 1.1,
      timeout: exports_Duration.toMillis(exports_Duration.seconds(15)),
      maxResults: 5,
      priority: 1,
      requiresKey: false
    })));
    engines.push(makeGoogleScholar(makeEngineConfig({
      name: "google-scholar",
      weight: 1.2,
      timeout: exports_Duration.toMillis(exports_Duration.seconds(20)),
      maxResults: 5,
      priority: 2,
      requiresKey: false
    })));
  }
  if (!flags || flags?.queryType === "code") {
    engines.push(makeGitHub(makeEngineConfig({
      name: "github",
      weight: 1,
      timeout: exports_Duration.toMillis(exports_Duration.seconds(15)),
      maxResults: 5,
      priority: 1,
      requiresKey: !!process.env.GITHUB_TOKEN
    })));
    engines.push(makeGitHubCode(makeEngineConfig({
      name: "github-code",
      weight: 1.1,
      timeout: exports_Duration.toMillis(exports_Duration.seconds(15)),
      maxResults: 5,
      priority: 2,
      requiresKey: !!process.env.GITHUB_TOKEN
    })));
    engines.push(makeGitHubIssues(makeEngineConfig({
      name: "github-issues",
      weight: 0.9,
      timeout: exports_Duration.toMillis(exports_Duration.seconds(15)),
      maxResults: 5,
      priority: 1,
      requiresKey: !!process.env.GITHUB_TOKEN
    })));
    engines.push(makeGitHubRepoFiles(makeEngineConfig({
      name: "github-repo-files",
      weight: 0.8,
      timeout: exports_Duration.toMillis(exports_Duration.seconds(20)),
      maxResults: 5,
      priority: 1,
      requiresKey: !!process.env.GITHUB_TOKEN
    })));
    engines.push(makeMDN(makeEngineConfig({
      name: "mdn",
      weight: 0.8,
      timeout: exports_Duration.toMillis(exports_Duration.seconds(15)),
      maxResults: 5,
      priority: 0,
      requiresKey: false
    })));
    engines.push(makeDocsRs(makeEngineConfig({
      name: "docsrs",
      weight: 0.8,
      timeout: exports_Duration.toMillis(exports_Duration.seconds(15)),
      maxResults: 5,
      priority: 0,
      requiresKey: false
    })));
    engines.push(makeReactDocs(makeEngineConfig({
      name: "react-docs",
      weight: 0.8,
      timeout: exports_Duration.toMillis(exports_Duration.seconds(15)),
      maxResults: 5,
      priority: 0,
      requiresKey: false
    })));
    engines.push(makeVueDocs(makeEngineConfig({
      name: "vue-docs",
      weight: 0.8,
      timeout: exports_Duration.toMillis(exports_Duration.seconds(15)),
      maxResults: 5,
      priority: 0,
      requiresKey: false
    })));
    engines.push(makePythonDocs(makeEngineConfig({
      name: "python-docs",
      weight: 0.8,
      timeout: exports_Duration.toMillis(exports_Duration.seconds(15)),
      maxResults: 5,
      priority: 0,
      requiresKey: false
    })));
    engines.push(makeGitLab(makeEngineConfig({
      name: "gitlab",
      weight: 0.9,
      timeout: exports_Duration.toMillis(exports_Duration.seconds(15)),
      maxResults: 5,
      priority: 1,
      requiresKey: !!process.env.GITLAB_TOKEN
    })));
    engines.push(makeHuggingFace(makeEngineConfig({
      name: "huggingface",
      weight: 1,
      timeout: exports_Duration.toMillis(exports_Duration.seconds(15)),
      maxResults: 5,
      priority: 1,
      requiresKey: false
    })));
    engines.push(makeGitea(makeEngineConfig({
      name: "gitea",
      weight: 0.8,
      timeout: exports_Duration.toMillis(exports_Duration.seconds(15)),
      maxResults: 5,
      priority: 0,
      requiresKey: false
    })));
    engines.push(makeSourceHut(makeEngineConfig({
      name: "sourcehut",
      weight: 0.6,
      timeout: exports_Duration.toMillis(exports_Duration.seconds(20)),
      maxResults: 5,
      priority: 0,
      requiresKey: false
    })));
  }
  if (!flags || flags?.queryType === "academic") {
    engines.push(makeWikipedia(makeEngineConfig({
      name: "wikipedia",
      weight: 0.9,
      timeout: exports_Duration.toMillis(exports_Duration.seconds(15)),
      maxResults: 5,
      priority: 0,
      requiresKey: false
    })));
  }
  engines.push(makeUnsplash(makeEngineConfig({ name: "unsplash", weight: 0.7, timeout: 1e4, maxResults: 4, requiresKey: false })));
  engines.push(makeHackerNews(makeEngineConfig({ name: "hackernews", weight: 0.8, timeout: 1e4, maxResults: 5, requiresKey: false })));
  engines.push(makePubMed(makeEngineConfig({ name: "pubmed", weight: 0.8, timeout: 1e4, maxResults: 5, requiresKey: false })));
  engines.push(makeNpm(makeEngineConfig({ name: "npm", weight: 0.7, timeout: 1e4, maxResults: 5, requiresKey: false })));
  engines.push(makeDockerHub(makeEngineConfig({ name: "dockerhub", weight: 0.6, timeout: 1e4, maxResults: 5, requiresKey: false })));
  engines.push(makeCoinGecko(makeEngineConfig({ name: "coingecko", weight: 0.7, timeout: 1e4, maxResults: 5, requiresKey: false })));
  engines.push(makeNominatim(makeEngineConfig({ name: "nominatim", weight: 0.6, timeout: 15000, maxResults: 5, requiresKey: false })));
  engines.push(makeCore(makeEngineConfig({ name: "core", weight: 0.7, timeout: 1e4, maxResults: 5, requiresKey: false })));
  engines.push(makeMarginalia(makeEngineConfig({ name: "marginalia", weight: 0.5, timeout: 15000, maxResults: 5, requiresKey: false })));
  engines.push(makePodchaser(makeEngineConfig({ name: "podchaser", weight: 0.5, timeout: 1e4, maxResults: 5, requiresKey: false })));
  engines.push(make9GAG(makeEngineConfig({ name: "9gag", weight: 0.4, timeout: 1e4, maxResults: 5, requiresKey: false })));
  engines.push(makeFrinkiac(makeEngineConfig({ name: "frinkiac", weight: 0.3, timeout: 1e4, maxResults: 3, requiresKey: false })));
  engines.push(makeZLibrary(makeEngineConfig({ name: "z-library", weight: 0.5, timeout: 15000, maxResults: 5, requiresKey: false })));
  engines.push(makeAppleAppStore(makeEngineConfig({ name: "apple-app-store", weight: 0.5, timeout: 1e4, maxResults: 5, requiresKey: false })));
  engines.push(makeMediaWiki(makeEngineConfig({ name: "britannica-wiki", weight: 0.5, timeout: 1e4, maxResults: 5, requiresKey: false }), "en.wiktionary.org"));
  engines.push(makeMediaWiki(makeEngineConfig({ name: "wikivoyage", weight: 0.4, timeout: 1e4, maxResults: 5, requiresKey: false }), "en.wikivoyage.org"));
  engines.push(makeStackExchange(makeEngineConfig({ name: "stackexchange", weight: 0.8, timeout: 1e4, maxResults: 5, requiresKey: false })));
  if (!flags || flags?.queryType === "video") {
    engines.push(makeIMDb(makeEngineConfig({
      name: "imdb",
      weight: 0.8,
      timeout: exports_Duration.toMillis(exports_Duration.seconds(15)),
      maxResults: 5,
      priority: 0,
      requiresKey: false
    })));
  }
  if (!flags) {
    engines.push(makeGooglePlay(makeEngineConfig({
      name: "google-play",
      weight: 0.7,
      timeout: exports_Duration.toMillis(exports_Duration.seconds(15)),
      maxResults: 5,
      priority: 0,
      requiresKey: false
    })));
  }
  if (!flags || flags?.queryType === "academic") {
    engines.push(makeGoodreads(makeEngineConfig({
      name: "goodreads",
      weight: 0.7,
      timeout: exports_Duration.toMillis(exports_Duration.seconds(15)),
      maxResults: 5,
      priority: 0,
      requiresKey: false
    })));
  }
  if (!flags || flags?.queryType === "code") {
    engines.push(makeCrates(makeEngineConfig({
      name: "crates",
      weight: 0.8,
      timeout: exports_Duration.toMillis(exports_Duration.seconds(15)),
      maxResults: 5,
      priority: 0,
      requiresKey: false
    })));
    engines.push(makeHex(makeEngineConfig({
      name: "hex",
      weight: 0.7,
      timeout: exports_Duration.toMillis(exports_Duration.seconds(15)),
      maxResults: 5,
      priority: 0,
      requiresKey: false
    })));
    engines.push(makeMicrosoftLearn(makeEngineConfig({
      name: "microsoft-learn",
      weight: 0.6,
      timeout: exports_Duration.toMillis(exports_Duration.seconds(15)),
      maxResults: 5,
      priority: 0,
      requiresKey: false
    })));
  }
  if (!flags || flags?.queryType === "code") {
    engines.push(makePyPIHtml(makeEngineConfig({
      name: "pypi-html",
      weight: 0.8,
      timeout: exports_Duration.toMillis(exports_Duration.seconds(15)),
      maxResults: 5,
      priority: 0,
      requiresKey: false
    })));
  }
  if (!flags || flags?.queryType === "academic") {
    engines.push(makeOpenLibrary(makeEngineConfig({
      name: "openlibrary",
      weight: 0.7,
      timeout: exports_Duration.toMillis(exports_Duration.seconds(15)),
      maxResults: 5,
      priority: 0,
      requiresKey: false
    })));
  }
  if (!flags) {
    engines.push(makeWallhaven(makeEngineConfig({
      name: "wallhaven",
      weight: 0.7,
      timeout: exports_Duration.toMillis(exports_Duration.seconds(15)),
      maxResults: 5,
      priority: 0,
      requiresKey: false
    })));
  }
  if (!flags) {
    engines.push(makeAdobeStock(makeEngineConfig({
      name: "adobe-stock",
      weight: 0.6,
      timeout: exports_Duration.toMillis(exports_Duration.seconds(15)),
      maxResults: 5,
      priority: 0,
      requiresKey: false
    })));
  }
  if (!flags) {
    engines.push(makeFindThatMeme(makeEngineConfig({
      name: "findthatmeme",
      weight: 0.4,
      timeout: exports_Duration.toMillis(exports_Duration.seconds(15)),
      maxResults: 5,
      priority: 0,
      requiresKey: false
    })));
  }
  if (!flags || flags?.queryType === "academic") {
    engines.push(makeCrossRef(makeEngineConfig({
      name: "crossref",
      weight: 0.9,
      timeout: exports_Duration.toMillis(exports_Duration.seconds(15)),
      maxResults: 5,
      priority: 1,
      requiresKey: false
    })));
    engines.push(makePdbe(makeEngineConfig({
      name: "pdbe",
      weight: 0.6,
      timeout: exports_Duration.toMillis(exports_Duration.seconds(20)),
      maxResults: 5,
      priority: 0,
      requiresKey: false
    })));
    engines.push(makeScanr(makeEngineConfig({
      name: "scanr",
      weight: 0.4,
      timeout: exports_Duration.toMillis(exports_Duration.seconds(20)),
      maxResults: 5,
      priority: 0,
      requiresKey: false
    })));
    engines.push(makeMoviepilot(makeEngineConfig({
      name: "moviepilot",
      weight: 0.5,
      timeout: exports_Duration.toMillis(exports_Duration.seconds(15)),
      maxResults: 5,
      priority: 0,
      requiresKey: false
    })));
    engines.push(makeAnnasArchive(makeEngineConfig({
      name: "annas-archive",
      weight: 0.4,
      timeout: exports_Duration.toMillis(exports_Duration.seconds(20)),
      maxResults: 5,
      priority: 0,
      requiresKey: false
    })));
  }
  if (!flags) {
    engines.push(makeOpenverse(makeEngineConfig({
      name: "openverse",
      weight: 0.7,
      timeout: exports_Duration.toMillis(exports_Duration.seconds(15)),
      maxResults: 5,
      priority: 0,
      requiresKey: false
    })));
  }
  if (!flags || flags?.queryType === "shopping") {
    engines.push(makeEbay(makeEngineConfig({
      name: "ebay",
      weight: 0.7,
      timeout: exports_Duration.toMillis(exports_Duration.seconds(15)),
      maxResults: 5,
      priority: 0,
      requiresKey: false
    })));
  }
  if (!flags || flags?.queryType === "shopping") {
    engines.push(makeSmzdm(makeEngineConfig({
      name: "smzdm",
      weight: 0.8,
      timeout: exports_Duration.toMillis(exports_Duration.seconds(20)),
      maxResults: 50,
      priority: 1,
      requiresKey: false
    })));
  }
  if (!flags || flags?.queryType === "shopping") {
    engines.push(makeJd(makeEngineConfig({
      name: "jd",
      weight: 0.7,
      timeout: exports_Duration.toMillis(exports_Duration.seconds(15)),
      maxResults: 5,
      priority: 1,
      requiresKey: false
    })));
  }
  if (!flags || flags?.queryType === "shopping") {
    engines.push(makeTaobao(makeEngineConfig({
      name: "taobao",
      weight: 0.7,
      timeout: exports_Duration.toMillis(exports_Duration.seconds(15)),
      maxResults: 5,
      priority: 1,
      requiresKey: false
    })));
  }
  if (!flags || flags?.queryType === "shopping") {
    engines.push(makePdd(makeEngineConfig({
      name: "pdd",
      weight: 0.7,
      timeout: exports_Duration.toMillis(exports_Duration.seconds(15)),
      maxResults: 5,
      priority: 1,
      requiresKey: false
    })));
  }
  if (!flags || flags?.queryType === "shopping") {
    engines.push(makeAmazonCn(makeEngineConfig({
      name: "amazon-cn",
      weight: 0.6,
      timeout: exports_Duration.toMillis(exports_Duration.seconds(15)),
      maxResults: 5,
      priority: 1,
      requiresKey: false
    })));
  }
  if (!flags || flags?.queryType === "shopping") {
    engines.push(makeSuning(makeEngineConfig({
      name: "suning",
      weight: 0.7,
      timeout: exports_Duration.toMillis(exports_Duration.seconds(15)),
      maxResults: 5,
      priority: 1,
      requiresKey: false
    })));
  }
  if (!flags || flags?.queryType === "shopping") {
    engines.push(makeGome(makeEngineConfig({
      name: "gome",
      weight: 0.6,
      timeout: exports_Duration.toMillis(exports_Duration.seconds(15)),
      maxResults: 5,
      priority: 1,
      requiresKey: false
    })));
  }
  if (!flags || flags?.queryType === "shopping") {
    engines.push(makeAmazonUs(makeEngineConfig({
      name: "amazon-us",
      weight: 0.6,
      timeout: exports_Duration.toMillis(exports_Duration.seconds(15)),
      maxResults: 5,
      priority: 1,
      requiresKey: false
    })));
  }
  if (!flags || flags?.queryType === "shopping") {
    engines.push(makeVip(makeEngineConfig({
      name: "vip",
      weight: 0.7,
      timeout: exports_Duration.toMillis(exports_Duration.seconds(15)),
      maxResults: 5,
      priority: 1,
      requiresKey: false
    })));
  }
  if (!flags || flags?.queryType === "shopping") {
    engines.push(makeYipin(makeEngineConfig({
      name: "1688",
      weight: 0.6,
      timeout: exports_Duration.toMillis(exports_Duration.seconds(20)),
      maxResults: 5,
      priority: 1,
      requiresKey: false
    })));
  }
  if (!flags || flags?.queryType === "shopping") {
    engines.push(makeDangdang(makeEngineConfig({
      name: "dangdang",
      weight: 0.6,
      timeout: exports_Duration.toMillis(exports_Duration.seconds(15)),
      maxResults: 5,
      priority: 1,
      requiresKey: false
    })));
  }
  if (!flags || flags?.queryType === "shopping") {
    engines.push(makeKaola(makeEngineConfig({
      name: "kaola",
      weight: 0.6,
      timeout: exports_Duration.toMillis(exports_Duration.seconds(15)),
      maxResults: 5,
      priority: 1,
      requiresKey: false
    })));
  }
  if (!flags) {
    engines.push(makePinterest(makeEngineConfig({
      name: "pinterest",
      weight: 0.7,
      timeout: exports_Duration.toMillis(exports_Duration.seconds(15)),
      maxResults: 5,
      priority: 0,
      requiresKey: false
    })));
  }
  if (!flags) {
    engines.push(makeQwant(makeEngineConfig({
      name: "qwant",
      weight: 0.8,
      timeout: exports_Duration.toMillis(exports_Duration.seconds(15)),
      maxResults: 5,
      priority: 0,
      requiresKey: false
    })));
  }
  if (!flags) {
    engines.push(makeYahoo(makeEngineConfig({
      name: "yahoo",
      weight: 0.8,
      timeout: exports_Duration.toMillis(exports_Duration.seconds(15)),
      maxResults: 5,
      priority: 0,
      requiresKey: false
    })));
  }
  if (!flags || flags?.queryType === "video") {
    engines.push(makeRottenTomatoes(makeEngineConfig({
      name: "rottentomatoes",
      weight: 0.7,
      timeout: exports_Duration.toMillis(exports_Duration.seconds(15)),
      maxResults: 5,
      priority: 0,
      requiresKey: false
    })));
  }
  if (!flags) {
    engines.push(makeSteam(makeEngineConfig({
      name: "steam",
      weight: 0.7,
      timeout: exports_Duration.toMillis(exports_Duration.seconds(15)),
      maxResults: 5,
      priority: 0,
      requiresKey: false
    })));
  }
  if (!flags) {
    engines.push(makePexels(makeEngineConfig({
      name: "pexels",
      weight: 0.7,
      timeout: exports_Duration.toMillis(exports_Duration.seconds(15)),
      maxResults: 5,
      priority: 0,
      requiresKey: false
    })));
  }
  if (!flags || flags?.queryType === "academic") {
    engines.push(makeOpenAlex(makeEngineConfig({
      name: "openalex",
      weight: 0.9,
      timeout: exports_Duration.toMillis(exports_Duration.seconds(15)),
      maxResults: 5,
      priority: 1,
      requiresKey: false
    })));
  }
  if (!flags || flags?.queryType === "video") {
    engines.push(makeNiconico(makeEngineConfig({
      name: "niconico",
      weight: 0.7,
      timeout: exports_Duration.toMillis(exports_Duration.seconds(15)),
      maxResults: 5,
      priority: 0,
      requiresKey: false
    })));
  }
  if (!flags) {
    engines.push(makeDeviantArt(makeEngineConfig({
      name: "deviantart",
      weight: 0.7,
      timeout: exports_Duration.toMillis(exports_Duration.seconds(15)),
      maxResults: 5,
      priority: 0,
      requiresKey: false
    })));
  }
  if (!flags || flags?.queryType === "video") {
    engines.push(makeGoogleVideos(makeEngineConfig({
      name: "google-videos",
      weight: 0.9,
      timeout: exports_Duration.toMillis(exports_Duration.seconds(15)),
      maxResults: 5,
      priority: 1,
      requiresKey: false
    })));
  }
  if (!flags || flags?.queryType === "social") {
    engines.push(makeBandcamp(makeEngineConfig({
      name: "bandcamp",
      weight: 0.7,
      timeout: exports_Duration.toMillis(exports_Duration.seconds(15)),
      maxResults: 5,
      priority: 0,
      requiresKey: false
    })));
  }
  if (!flags || flags?.queryType === "social") {
    engines.push(makeGenius(makeEngineConfig({
      name: "genius",
      weight: 0.7,
      timeout: exports_Duration.toMillis(exports_Duration.seconds(15)),
      maxResults: 5,
      priority: 0,
      requiresKey: false
    })));
  }
  if (!flags) {
    engines.push(makeImgur(makeEngineConfig({
      name: "imgur",
      weight: 0.7,
      timeout: exports_Duration.toMillis(exports_Duration.seconds(15)),
      maxResults: 5,
      priority: 0,
      requiresKey: false
    })));
  }
  if (!flags || flags?.queryType === "video") {
    engines.push(makeRumble(makeEngineConfig({
      name: "rumble",
      weight: 0.7,
      timeout: exports_Duration.toMillis(exports_Duration.seconds(15)),
      maxResults: 5,
      priority: 0,
      requiresKey: false
    })));
  }
  if (!flags || flags?.queryType === "code") {
    engines.push(makePkgGoDev(makeEngineConfig({
      name: "pkg-go-dev",
      weight: 0.8,
      timeout: exports_Duration.toMillis(exports_Duration.seconds(15)),
      maxResults: 5,
      priority: 0,
      requiresKey: false
    })));
  }
  if (!flags || flags?.queryType === "video") {
    engines.push(makePeerTube(makeEngineConfig({
      name: "peertube",
      weight: 0.7,
      timeout: exports_Duration.toMillis(exports_Duration.seconds(15)),
      maxResults: 5,
      priority: 0,
      requiresKey: false
    })));
  }
  if (!flags || flags?.queryType === "video") {
    engines.push(makeSepiaSearch(makeEngineConfig({
      name: "sepiasearch",
      weight: 0.6,
      timeout: exports_Duration.toMillis(exports_Duration.seconds(15)),
      maxResults: 5,
      priority: 0,
      requiresKey: false
    })));
  }
  if (!flags) {
    engines.push(makePixiv(makeEngineConfig({
      name: "pixiv",
      weight: 0.7,
      timeout: exports_Duration.toMillis(exports_Duration.seconds(15)),
      maxResults: 5,
      priority: 0,
      requiresKey: false
    })));
  }
  if (!flags || flags?.queryType === "social") {
    engines.push(makeDeezer(makeEngineConfig({
      name: "deezer",
      weight: 0.7,
      timeout: exports_Duration.toMillis(exports_Duration.seconds(15)),
      maxResults: 5,
      priority: 0,
      requiresKey: false
    })));
  }
  if (!flags) {
    engines.push(makeFyyd(makeEngineConfig({
      name: "fyyd",
      weight: 0.5,
      timeout: exports_Duration.toMillis(exports_Duration.seconds(15)),
      maxResults: 5,
      priority: 0,
      requiresKey: false
    })));
  }
  if (!flags || flags?.queryType === "news") {
    engines.push(makeReuters(makeEngineConfig({
      name: "reuters",
      weight: 0.8,
      timeout: exports_Duration.toMillis(exports_Duration.seconds(15)),
      maxResults: 5,
      priority: 1,
      requiresKey: false
    })));
  }
  if (!flags) {
    engines.push(makeRadioBrowser(makeEngineConfig({
      name: "radio-browser",
      weight: 0.5,
      timeout: exports_Duration.toMillis(exports_Duration.seconds(15)),
      maxResults: 5,
      priority: 0,
      requiresKey: false
    })));
  }
  if (!flags) {
    engines.push(makeWttr(makeEngineConfig({
      name: "wttr",
      weight: 0.6,
      timeout: exports_Duration.toMillis(exports_Duration.seconds(10)),
      maxResults: 3,
      priority: 0,
      requiresKey: false
    })));
  }
  if (!flags || flags?.queryType === "news") {
    engines.push(makeYahooNews(makeEngineConfig({
      name: "yahoo-news",
      weight: 0.8,
      timeout: exports_Duration.toMillis(exports_Duration.seconds(15)),
      maxResults: 5,
      priority: 1,
      requiresKey: false
    })));
  }
  if (!flags || flags?.queryType === "news") {
    engines.push(makeTagesschau(makeEngineConfig({
      name: "tagesschau",
      weight: 0.5,
      timeout: exports_Duration.toMillis(exports_Duration.seconds(15)),
      maxResults: 5,
      priority: 0,
      requiresKey: false
    })));
  }
  if (!flags || flags?.queryType === "news") {
    engines.push(makeAnsa(makeEngineConfig({
      name: "ansa",
      weight: 0.5,
      timeout: exports_Duration.toMillis(exports_Duration.seconds(15)),
      maxResults: 5,
      priority: 0,
      requiresKey: false
    })));
  }
  if (!flags || flags?.queryType === "general") {
    engines.push(makeSensCritique(makeEngineConfig({
      name: "senscritique",
      weight: 0.4,
      timeout: exports_Duration.toMillis(exports_Duration.seconds(15)),
      maxResults: 5,
      priority: 0,
      requiresKey: false
    })));
  }
  if (!flags || flags?.queryType === "social") {
    engines.push(makeMixcloud(makeEngineConfig({
      name: "mixcloud",
      weight: 0.7,
      timeout: exports_Duration.toMillis(exports_Duration.seconds(15)),
      maxResults: 5,
      priority: 0,
      requiresKey: false
    })));
  }
  if (!flags || flags?.queryType === "code") {
    engines.push(makeLibRs(makeEngineConfig({
      name: "lib-rs",
      weight: 0.7,
      timeout: exports_Duration.toMillis(exports_Duration.seconds(15)),
      maxResults: 5,
      priority: 0,
      requiresKey: false
    })));
  }
  if (!flags || flags?.queryType === "code") {
    engines.push(makeNvd(makeEngineConfig({
      name: "nvd",
      weight: 0.5,
      timeout: exports_Duration.toMillis(exports_Duration.seconds(15)),
      maxResults: 5,
      priority: 0,
      requiresKey: false
    })));
  }
  if (!flags || flags?.queryType === "code") {
    engines.push(makeRepology(makeEngineConfig({
      name: "repology",
      weight: 0.5,
      timeout: exports_Duration.toMillis(exports_Duration.seconds(15)),
      maxResults: 5,
      priority: 0,
      requiresKey: false
    })));
  }
  if (!flags) {
    engines.push(makeFDroid(makeEngineConfig({
      name: "fdroid",
      weight: 0.7,
      timeout: exports_Duration.toMillis(exports_Duration.seconds(15)),
      maxResults: 5,
      priority: 0,
      requiresKey: false
    })));
  }
  if (!flags || flags?.queryType === "social") {
    engines.push(makeMastodon(makeEngineConfig({
      name: "mastodon",
      weight: 0.7,
      timeout: exports_Duration.toMillis(exports_Duration.seconds(15)),
      maxResults: 5,
      priority: 0,
      requiresKey: false
    })));
  }
  if (!flags) {
    engines.push(makeCurrencyConvert(makeEngineConfig({
      name: "currency-convert",
      weight: 0.7,
      timeout: exports_Duration.toMillis(exports_Duration.seconds(15)),
      maxResults: 5,
      priority: 0,
      requiresKey: false
    })));
  }
  if (!flags) {
    engines.push(makeArtStation(makeEngineConfig({
      name: "artstation",
      weight: 0.7,
      timeout: exports_Duration.toMillis(exports_Duration.seconds(15)),
      maxResults: 5,
      priority: 0,
      requiresKey: false
    })));
  }
  if (!flags) {
    engines.push(makeArtic(makeEngineConfig({
      name: "artic",
      weight: 0.5,
      timeout: exports_Duration.toMillis(exports_Duration.seconds(15)),
      maxResults: 5,
      priority: 0,
      requiresKey: false
    })));
  }
  if (!flags) {
    engines.push(make1x(makeEngineConfig({
      name: "1x",
      weight: 0.3,
      timeout: exports_Duration.toMillis(exports_Duration.seconds(10)),
      maxResults: 5,
      priority: 0,
      requiresKey: false
    })));
  }
  if (!flags) {
    engines.push(makeCara(makeEngineConfig({
      name: "cara",
      weight: 0.5,
      timeout: exports_Duration.toMillis(exports_Duration.seconds(15)),
      maxResults: 5,
      priority: 0,
      requiresKey: false
    })));
  }
  if (!flags) {
    engines.push(makeOpenClipArt(makeEngineConfig({
      name: "openclipart",
      weight: 0.4,
      timeout: exports_Duration.toMillis(exports_Duration.seconds(15)),
      maxResults: 5,
      priority: 0,
      requiresKey: false
    })));
  }
  if (!flags) {
    engines.push(makeLoc(makeEngineConfig({
      name: "loc",
      weight: 0.4,
      timeout: exports_Duration.toMillis(exports_Duration.seconds(15)),
      maxResults: 5,
      priority: 0,
      requiresKey: false
    })));
  }
  if (!flags) {
    engines.push(makeIpernity(makeEngineConfig({
      name: "ipernity",
      weight: 0.4,
      timeout: exports_Duration.toMillis(exports_Duration.seconds(15)),
      maxResults: 5,
      priority: 0,
      requiresKey: false
    })));
  }
  if (!flags) {
    engines.push(makeUxwing(makeEngineConfig({
      name: "uxwing",
      weight: 0.3,
      timeout: exports_Duration.toMillis(exports_Duration.seconds(10)),
      maxResults: 5,
      priority: 0,
      requiresKey: false
    })));
  }
  if (!flags) {
    engines.push(makeFlaticon(makeEngineConfig({
      name: "flaticon",
      weight: 0.3,
      timeout: exports_Duration.toMillis(exports_Duration.seconds(10)),
      maxResults: 5,
      priority: 0,
      requiresKey: false
    })));
  }
  if (!flags) {
    engines.push(makeSelfhst(makeEngineConfig({
      name: "selfhst",
      weight: 0.2,
      timeout: exports_Duration.toMillis(exports_Duration.seconds(10)),
      maxResults: 5,
      priority: 0,
      requiresKey: false
    })));
  }
  if (!flags) {
    engines.push(makeDevicons(makeEngineConfig({
      name: "devicons",
      weight: 0.2,
      timeout: exports_Duration.toMillis(exports_Duration.seconds(10)),
      maxResults: 3,
      priority: 0,
      requiresKey: false
    })));
  }
  if (!flags) {
    engines.push(makeLucide(makeEngineConfig({
      name: "lucide",
      weight: 0.2,
      timeout: exports_Duration.toMillis(exports_Duration.seconds(10)),
      maxResults: 3,
      priority: 0,
      requiresKey: false
    })));
  }
  if (!flags) {
    engines.push(makeMaterialIcons(makeEngineConfig({
      name: "material-icons",
      weight: 0.2,
      timeout: exports_Duration.toMillis(exports_Duration.seconds(10)),
      maxResults: 3,
      priority: 0,
      requiresKey: false
    })));
  }
  if (!flags || flags?.queryType === "academic") {
    engines.push(makeWikidata(makeEngineConfig({
      name: "wikidata",
      weight: 0.8,
      timeout: exports_Duration.toMillis(exports_Duration.seconds(15)),
      maxResults: 5,
      priority: 0,
      requiresKey: false
    })));
  }
  if (!flags) {
    engines.push(makeWikimediaCommons(makeEngineConfig({
      name: "wikicommons",
      weight: 0.7,
      timeout: exports_Duration.toMillis(exports_Duration.seconds(15)),
      maxResults: 5,
      priority: 0,
      requiresKey: false
    })));
  }
  if (!flags || flags?.queryType === "code") {
    engines.push(makeMetacpan(makeEngineConfig({
      name: "metacpan",
      weight: 0.8,
      timeout: exports_Duration.toMillis(exports_Duration.seconds(15)),
      maxResults: 5,
      priority: 0,
      requiresKey: false
    })));
  }
  if (!flags || flags?.queryType === "code") {
    engines.push(makeArchLinux(makeEngineConfig({
      name: "archlinux",
      weight: 0.7,
      timeout: exports_Duration.toMillis(exports_Duration.seconds(15)),
      maxResults: 5,
      priority: 0,
      requiresKey: false
    })));
  }
  if (!flags || flags?.queryType === "code") {
    engines.push(makeAlpineLinux(makeEngineConfig({
      name: "alpinelinux",
      weight: 0.7,
      timeout: exports_Duration.toMillis(exports_Duration.seconds(15)),
      maxResults: 5,
      priority: 0,
      requiresKey: false
    })));
  }
  if (!flags || flags?.queryType === "code") {
    engines.push(makeVoidLinux(makeEngineConfig({
      name: "voidlinux",
      weight: 0.7,
      timeout: exports_Duration.toMillis(exports_Duration.seconds(15)),
      maxResults: 5,
      priority: 0,
      requiresKey: false
    })));
  }
  if (!flags || flags?.queryType === "video") {
    engines.push(make500px(makeEngineConfig({
      name: "500px",
      weight: 0.7,
      timeout: exports_Duration.toMillis(exports_Duration.seconds(15)),
      maxResults: 5,
      priority: 0,
      requiresKey: false
    })));
  }
  if (!flags || flags?.queryType === "social") {
    engines.push(makeFreesound(makeEngineConfig({
      name: "freesound",
      weight: 0.7,
      timeout: exports_Duration.toMillis(exports_Duration.seconds(15)),
      maxResults: 5,
      priority: 0,
      requiresKey: false
    })));
  }
  if (flags?.queryType === "social" || !flags && !!process.env.SPOTIFY_ACCESS_TOKEN) {
    engines.push(makeSpotify(makeEngineConfig({
      name: "spotify",
      weight: 0.8,
      timeout: exports_Duration.toMillis(exports_Duration.seconds(15)),
      maxResults: 5,
      priority: 1,
      requiresKey: true
    })));
  }
  if (!flags) {
    engines.push(makeOpenMeteo(makeEngineConfig({
      name: "open-meteo",
      weight: 0.7,
      timeout: exports_Duration.toMillis(exports_Duration.seconds(15)),
      maxResults: 3,
      priority: 0,
      requiresKey: false
    })));
  }
  if (!flags || flags?.queryType === "social") {
    engines.push(makeLemmy(makeEngineConfig({
      name: "lemmy",
      weight: 0.7,
      timeout: exports_Duration.toMillis(exports_Duration.seconds(20)),
      maxResults: 5,
      priority: 0,
      requiresKey: false
    })));
  }
  if (!flags || flags?.queryType === "social") {
    engines.push(makeDiscourse(makeEngineConfig({
      name: "discourse",
      weight: 0.7,
      timeout: exports_Duration.toMillis(exports_Duration.seconds(20)),
      maxResults: 5,
      priority: 0,
      requiresKey: false
    })));
  }
  if (!flags || flags?.queryType === "social") {
    engines.push(makeBoardreader(makeEngineConfig({
      name: "boardreader",
      weight: 0.6,
      timeout: exports_Duration.toMillis(exports_Duration.seconds(20)),
      maxResults: 5,
      priority: 0,
      requiresKey: false
    })));
  }
  if (!flags || flags?.queryType === "social") {
    engines.push(makeTootfinder(makeEngineConfig({
      name: "tootfinder",
      weight: 0.5,
      timeout: exports_Duration.toMillis(exports_Duration.seconds(15)),
      maxResults: 5,
      priority: 0,
      requiresKey: false
    })));
  }
  if (!flags) {
    engines.push(makeDictzone(makeEngineConfig({
      name: "dictzone",
      weight: 0.5,
      timeout: exports_Duration.toMillis(exports_Duration.seconds(15)),
      maxResults: 5,
      priority: 0,
      requiresKey: false
    })));
    engines.push(makeDuden(makeEngineConfig({
      name: "duden",
      weight: 0.5,
      timeout: exports_Duration.toMillis(exports_Duration.seconds(15)),
      maxResults: 5,
      priority: 0,
      requiresKey: false
    })));
    engines.push(makeEmojipedia(makeEngineConfig({
      name: "emojipedia",
      weight: 0.4,
      timeout: exports_Duration.toMillis(exports_Duration.seconds(10)),
      maxResults: 3,
      priority: 0,
      requiresKey: false
    })));
    engines.push(makeJisho(makeEngineConfig({
      name: "jisho",
      weight: 0.5,
      timeout: exports_Duration.toMillis(exports_Duration.seconds(10)),
      maxResults: 5,
      priority: 0,
      requiresKey: false
    })));
  }
  if (!flags) {
    engines.push(makeTinEye(makeEngineConfig({
      name: "tineye",
      weight: 0.7,
      timeout: exports_Duration.toMillis(exports_Duration.seconds(15)),
      maxResults: 5,
      priority: 0,
      requiresKey: false
    })));
  }
  if (!flags || flags?.queryType === "social") {
    engines.push(makeYandexMusic(makeEngineConfig({
      name: "yandex-music",
      weight: 0.7,
      timeout: exports_Duration.toMillis(exports_Duration.seconds(15)),
      maxResults: 5,
      priority: 0,
      requiresKey: false
    })));
  }
  if (!flags) {
    engines.push(makeLingva(makeEngineConfig({
      name: "lingva",
      weight: 0.6,
      timeout: exports_Duration.toMillis(exports_Duration.seconds(10)),
      maxResults: 3,
      priority: 0,
      requiresKey: false
    })));
  }
  if (!flags) {
    engines.push(makeLibreTranslate(makeEngineConfig({
      name: "libretranslate",
      weight: 0.6,
      timeout: exports_Duration.toMillis(exports_Duration.seconds(10)),
      maxResults: 3,
      priority: 0,
      requiresKey: false
    })));
  }
  if (!flags) {
    engines.push(makeDeepL(makeEngineConfig({
      name: "deepl",
      weight: 0.7,
      timeout: exports_Duration.toMillis(exports_Duration.seconds(10)),
      maxResults: 3,
      priority: 0,
      requiresKey: true
    })));
  }
  if (flags?.queryType === "news") {
    engines.push(makeBingNews(makeEngineConfig({
      name: "bing-news",
      weight: 1.1,
      timeout: exports_Duration.toMillis(exports_Duration.seconds(15)),
      maxResults: 10,
      priority: 2,
      requiresKey: false
    })));
    engines.push(makeGoogleNews(makeEngineConfig({
      name: "google-news",
      weight: 1.2,
      timeout: exports_Duration.toMillis(exports_Duration.seconds(20)),
      maxResults: 10,
      priority: 3,
      requiresKey: false
    })));
    for (const e of engines) {
      e.config.maxResults = Math.max(e.config.maxResults, 10);
    }
  }
  if (!flags || flags?.queryType === "news" || !flags?.queryType) {
    engines.push(makeBbcNews(makeEngineConfig({ name: "bbc-news", weight: 0.8, timeout: 12000, maxResults: 5, requiresKey: false })));
    engines.push(makeTheGuardian(makeEngineConfig({ name: "theguardian", weight: 0.7, timeout: 12000, maxResults: 5, requiresKey: false })));
    engines.push(makeTechCrunch(makeEngineConfig({ name: "techcrunch", weight: 0.7, timeout: 1e4, maxResults: 5, requiresKey: false })));
    engines.push(makeTheVerge(makeEngineConfig({ name: "theverge", weight: 0.6, timeout: 12000, maxResults: 5, requiresKey: false })));
    engines.push(makeArsTechnica(makeEngineConfig({ name: "arstechnica", weight: 0.6, timeout: 12000, maxResults: 5, requiresKey: false })));
  }
  engines.push(makeYahooFinance(makeEngineConfig({ name: "yahoo-finance", weight: 0.7, timeout: 1e4, maxResults: 5, requiresKey: false })));
  engines.push(makeFred(makeEngineConfig({ name: "fred", weight: 0.6, timeout: 12000, maxResults: 5, requiresKey: false })));
  engines.push(makeZenodo(makeEngineConfig({ name: "zenodo", weight: 0.6, timeout: 12000, maxResults: 5, requiresKey: false })));
  engines.push(makeAds(makeEngineConfig({ name: "ads", weight: 0.6, timeout: 15000, maxResults: 5, requiresKey: false })));
  engines.push(makeOpenAirePublications(makeEngineConfig({ name: "openaire", weight: 0.6, timeout: 12000, maxResults: 5, requiresKey: false })));
  engines.push(makePackagist(makeEngineConfig({ name: "packagist", weight: 0.6, timeout: 1e4, maxResults: 5, requiresKey: false })));
  engines.push(makeRubyGems(makeEngineConfig({ name: "rubygems", weight: 0.6, timeout: 1e4, maxResults: 5, requiresKey: false })));
  engines.push(makePubDev(makeEngineConfig({ name: "pub-dev", weight: 0.5, timeout: 1e4, maxResults: 5, requiresKey: false })));
  engines.push(makeMankier(makeEngineConfig({ name: "mankier", weight: 0.5, timeout: 1e4, maxResults: 5, requiresKey: false })));
  engines.push(makeHoogle(makeEngineConfig({ name: "hoogle", weight: 0.5, timeout: 1e4, maxResults: 5, requiresKey: false })));
  engines.push(makeWiby(makeEngineConfig({ name: "wiby", weight: 0.5, timeout: 12000, maxResults: 5, requiresKey: false })));
  engines.push(makeEncyclosearch(makeEngineConfig({ name: "encyclosearch", weight: 0.5, timeout: 12000, maxResults: 5, requiresKey: false })));
  engines.push(makeEtymonline(makeEngineConfig({ name: "etymonline", weight: 0.5, timeout: 1e4, maxResults: 5, requiresKey: false })));
  engines.push(makeOpenFoodFacts(makeEngineConfig({ name: "openfoodfacts", weight: 0.5, timeout: 12000, maxResults: 5, requiresKey: false })));
  engines.push(makeMusicBrainz(makeEngineConfig({ name: "musicbrainz", weight: 0.6, timeout: 12000, maxResults: 5, requiresKey: false })));
  engines.push(makeIgdb(makeEngineConfig({ name: "igdb", weight: 0.6, timeout: 12000, maxResults: 5, requiresKey: false })));
  engines.push(makeRawg(makeEngineConfig({ name: "rawg", weight: 0.6, timeout: 12000, maxResults: 5, requiresKey: false })));
  engines.push(makeTvMaze(makeEngineConfig({ name: "tvmaze", weight: 0.6, timeout: 1e4, maxResults: 5, requiresKey: false })));
  engines.push(makeOpenWeather(makeEngineConfig({ name: "openweather", weight: 0.6, timeout: 1e4, maxResults: 1, requiresKey: true })));
  return engines;
}
function engineSummary(engines) {
  const names = engines.map((e) => `${e.name}(weight=${e.config.weight})`);
  return `已启用引擎: ${names.join(", ")}`;
}

// src/search/cache.ts
var exports_cache = {};
__export(exports_cache, {
  globalResultCache: () => globalResultCache,
  SearchCache: () => exports_cache,
  ResultCache: () => ResultCache
});

class ResultCache {
  cache = new Map;
  accessOrder = [];
  maxSize;
  ttl;
  hits = 0;
  misses = 0;
  constructor(maxSize = 100, ttlMs = 60000) {
    this.maxSize = maxSize;
    this.ttl = ttlMs;
  }
  static makeKey(query, opts = {}) {
    return `${query}|${opts.numResults ?? 8}|${opts.timeRange ?? ""}|${opts.lang ?? ""}`;
  }
  get(key) {
    const entry = this.cache.get(key);
    if (!entry) {
      this.misses++;
      return;
    }
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this._removeFromAccessOrder(key);
      this.misses++;
      return;
    }
    this._touch(key);
    this.hits++;
    return entry.results;
  }
  set(key, results) {
    if (this.cache.has(key)) {
      this._touch(key);
      this.cache.set(key, { results, expiresAt: Date.now() + this.ttl });
      return;
    }
    if (this.cache.size >= this.maxSize) {
      const lruKey = this.accessOrder.shift();
      if (lruKey !== undefined)
        this.cache.delete(lruKey);
    }
    this.accessOrder.push(key);
    this.cache.set(key, { results, expiresAt: Date.now() + this.ttl });
  }
  _touch(key) {
    this._removeFromAccessOrder(key);
    this.accessOrder.push(key);
  }
  _removeFromAccessOrder(key) {
    const idx = this.accessOrder.indexOf(key);
    if (idx !== -1)
      this.accessOrder.splice(idx, 1);
  }
  clear() {
    this.cache.clear();
    this.accessOrder = [];
    this.hits = 0;
    this.misses = 0;
  }
  get size() {
    return this.cache.size;
  }
  get hitRate() {
    const total = this.hits + this.misses;
    return total === 0 ? 0 : this.hits / total;
  }
}
var globalResultCache = new ResultCache(100, 60000);

// src/search/query-intent.ts
var exports_query_intent = {};
__export(exports_query_intent, {
  optimizeQuery: () => optimizeQuery,
  intentToFlags: () => intentToFlags,
  extractKeywords: () => extractKeywords,
  detectQueryIntent: () => detectQueryIntent,
  detectGitHubQuery: () => detectGitHubQuery,
  QueryIntent: () => exports_query_intent
});
var GITHUB_REPO_PATTERN = /^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/;
var GITHUB_CODE_QUALIFIER = /\brepo:([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)\b/;
var GITHUB_URL_PATTERN = /github\.com\/([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)(?:\/.*)?$/;
var LANG_NAMES = [
  "rust",
  "python",
  "typescript",
  "javascript",
  "go",
  "golang",
  "java",
  "cplusplus",
  "csharp",
  "ruby",
  "swift",
  "kotlin",
  "scala",
  "php",
  "perl",
  "lua",
  "haskell",
  "elixir",
  "clojure",
  "dart",
  "flutter",
  "react",
  "vue",
  "angular",
  "node",
  "deno",
  "bun",
  "nextjs",
  "nuxt",
  "svelte"
];
var LANG_PATTERN = new RegExp(`\\b(${LANG_NAMES.join("|")})\\b`, "i");
var CURRENCY_PATTERN = /\b([A-Z]{3})\s+(?:to|in|=>)\s+([A-Z]{3})\b/i;
var WEATHER_PATTERN = /\b(weather|temperature|forecast|°[cf]|humidity|wind|rain|snow)\b/i;
var WEATHER_CN = /天气|温度|预报|湿度|风力|降雨|下雪|气温|℃|℉/;
var TRANSLATION_PATTERN = /\b(translate|meaning|definition|dictionary|duden|dictzone)\b/i;
var TRANSLATION_CN = /翻译|意思|定义|词典|字典|释义/;
var URL_PATTERN = /^https?:\/\//i;
var SHOPPING_PATTERN = /\b(price|buy|shop|deal|discount|coupon|cheap|best price|compare|purchase|order)\b/i;
var SHOPPING_CN = /价格|多少钱|报价|售价|优惠|打折|促销|比价|性价比|购买|商城|旗舰店|专柜|正品|包邮|多少钱一个|什么价|值得买|评测|测评/;
var VIDEO_PATTERN = /\b(watch|video|episode|trailer|clip)\b/i;
var VIDEO_CN = /视频|观看|电影|电视剧|动漫|番剧|短片|预告|直播/;
var NEWS_PATTERN = /\b(news|latest|breaking|update|today|报道|新闻|最新)\b/i;
var NEWS_CN = /报道|新闻|最新|快讯|头条|时政|国际|国内|社会|热点/;
var ACADEMIC_PATTERN = /\b(paper|thesis|doi|arxiv|semantic scholar|citation|reference|research|journal|proceedings)\b/i;
var CODE_KEYWORDS = [
  "\\bhow to\\b",
  "\\bwhat is\\b",
  "\\binstall\\b",
  "\\bnpm\\b",
  "\\bpip\\b",
  "\\bcargo\\b",
  "\\bgit\\b",
  "\\bapi\\b",
  "\\brest\\b",
  "\\bgraphql\\b",
  "\\bsql\\b",
  "\\bquery\\b",
  "\\bfunction\\b",
  "\\bclass\\b",
  "\\binterface\\b",
  "\\btype\\b",
  "\\berror\\b",
  "\\bbug\\b",
  "\\bdebug\\b",
  "\\bcompile\\b",
  "\\bsort\\b",
  "\\barray\\b",
  "\\blist\\b",
  "\\bmap\\b",
  "\\bfilter\\b",
  "\\breduce\\b",
  "\\balgorithm\\b",
  "\\btutorial\\b",
  "\\bguide\\b",
  "\\bdocumentation\\b",
  "\\bdocs\\b",
  "\\bdocker\\b",
  "\\bdeploy\\b",
  "\\bserver\\b",
  "\\bclient\\b",
  "\\bfrontend\\b",
  "\\bbackend\\b",
  "\\bfullstack\\b",
  "\\bleetcode\\b",
  "\\bcoding\\b"
];
var CODE_PATTERN = new RegExp(CODE_KEYWORDS.concat([LANG_PATTERN.source]).join("|"), "i");
function detectGitHubQuery(query) {
  const trimmed = query.trim();
  if (!trimmed)
    return;
  const urlMatch = trimmed.match(GITHUB_URL_PATTERN);
  if (urlMatch) {
    const owner = urlMatch[1];
    const repo = urlMatch[2];
    if (trimmed.includes("/issues") || trimmed.includes("/pull") || trimmed.includes("issue") || trimmed.includes("PR")) {
      return { owner, repo, isGitHubIssue: true, isGitHubRepo: true };
    }
    return { owner, repo, isGitHubRepo: true };
  }
  const codeMatch = trimmed.match(GITHUB_CODE_QUALIFIER);
  if (codeMatch) {
    const owner = codeMatch[1];
    const repo = codeMatch[2];
    return { owner, repo, isGitHubCodeSearch: true, isGitHubRepo: true };
  }
  const repoMatch = trimmed.match(GITHUB_REPO_PATTERN);
  if (repoMatch) {
    const parts2 = trimmed.split("/");
    const owner = parts2[0];
    const repo = parts2[1];
    if (owner.length >= 2 && repo.length >= 2 && !owner.includes(".") && !trimmed.startsWith("http")) {
      return { owner, repo, isGitHubRepo: true };
    }
  }
  return;
}
function detectQueryIntent(query) {
  const trimmed = query.trim();
  if (!trimmed)
    return {};
  if (URL_PATTERN.test(trimmed)) {
    return { queryType: "general" };
  }
  if (CURRENCY_PATTERN.test(trimmed)) {
    return { queryType: "general", isCurrency: true };
  }
  if (WEATHER_PATTERN.test(trimmed) || WEATHER_CN.test(trimmed)) {
    return { queryType: "general", isWeather: true };
  }
  if (TRANSLATION_PATTERN.test(trimmed) || TRANSLATION_CN.test(trimmed)) {
    return { queryType: "general", isTranslation: true };
  }
  const gh = detectGitHubQuery(trimmed);
  if (gh?.isGitHubRepo) {
    return { ...gh, queryType: "code" };
  }
  if (CODE_PATTERN.test(trimmed) || LANG_PATTERN.test(trimmed)) {
    return { queryType: "code" };
  }
  if (ACADEMIC_PATTERN.test(trimmed)) {
    return { queryType: "academic" };
  }
  if (SHOPPING_PATTERN.test(trimmed) || SHOPPING_CN.test(trimmed)) {
    return { queryType: "shopping" };
  }
  if (VIDEO_PATTERN.test(trimmed) || VIDEO_CN.test(trimmed)) {
    return { queryType: "video" };
  }
  if (NEWS_PATTERN.test(trimmed) || NEWS_CN.test(trimmed)) {
    return { queryType: "news" };
  }
  return { queryType: "general" };
}
function intentToFlags(intent) {
  const flags = {};
  if (intent.isCurrency)
    flags.currency = true;
  if (intent.isWeather)
    flags.weather = true;
  if (intent.isTranslation)
    flags.translation = true;
  return flags;
}
function optimizeQuery(query, intent) {
  const trimmed = query.trim();
  if (!trimmed)
    return [""];
  const variants = [trimmed];
  if (intent.queryType === "code") {
    variants.push(`${trimmed} documentation`);
    variants.push(`${trimmed} tutorial`);
    variants.push(`${trimmed} example`);
  } else if (intent.queryType === "academic") {
    variants.push(`${trimmed} research paper`);
    variants.push(`${trimmed} study`);
    variants.push(`${trimmed} journal`);
  } else if (intent.queryType === "news") {
    variants.push(`${trimmed} latest news`);
  } else if (intent.queryType === "video") {
    variants.push(`${trimmed} video`);
  } else if (intent.queryType === "shopping") {
    variants.push(`${trimmed} 价格`);
    variants.push(`${trimmed} 优惠`);
    variants.push(`${trimmed} 评测`);
  } else if (intent.isTranslation) {
    variants.push(`${trimmed} meaning`);
    variants.push(`${trimmed} definition`);
  } else if (intent.isWeather) {
    variants.push(`${trimmed} weather forecast`);
  }
  const keywords = extractKeywords(trimmed);
  if (keywords.length > 0 && keywords.join(" ") !== trimmed) {
    variants.push(keywords.join(" "));
  }
  return [...new Set(variants)];
}
var STOP_WORDS = new Set([
  "the",
  "a",
  "an",
  "is",
  "are",
  "was",
  "were",
  "in",
  "on",
  "at",
  "to",
  "for",
  "of",
  "and",
  "or",
  "but",
  "with",
  "by",
  "from",
  "as",
  "into",
  "through",
  "what",
  "how",
  "why",
  "when",
  "where",
  "which",
  "who",
  "whom",
  "this",
  "that",
  "these",
  "those",
  "it",
  "its",
  "has",
  "have",
  "had",
  "do",
  "does",
  "did",
  "will",
  "would",
  "can",
  "could",
  "should",
  "may",
  "about",
  "than",
  "then",
  "also",
  "just",
  "very",
  "not",
  "no",
  "be",
  "been",
  "的",
  "了",
  "是",
  "在",
  "我",
  "他",
  "她",
  "它",
  "们",
  "有",
  "和",
  "与",
  "就",
  "但",
  "也",
  "都",
  "而",
  "及",
  "或",
  "被",
  "把",
  "对",
  "从",
  "到",
  "让",
  "上",
  "下",
  "来",
  "去",
  "用",
  "为",
  "能",
  "会",
  "要",
  "想",
  "说",
  "不",
  "这",
  "那",
  "个",
  "人",
  "大",
  "小",
  "多",
  "少",
  "很",
  "更",
  "最"
]);
var BAD_KEYWORDS = new Set([
  "未来展望",
  "发展趋势",
  "战略规划",
  "政策导向",
  "管理机制",
  "态度分析",
  "公众反应",
  "情绪倾向",
  "舆情管理",
  "implementation",
  "utilization",
  "facilitation",
  "methodology"
]);
function extractKeywords(query, maxTokens = 5) {
  const tokens = query.split(/[\s,，。！？；：、()（）""''【】《》/\\]+/).filter(Boolean);
  const keywords = [];
  for (const token of tokens) {
    const cleaned = token.trim().toLowerCase();
    if (!cleaned)
      continue;
    if (cleaned.length <= 1)
      continue;
    if (STOP_WORDS.has(cleaned))
      continue;
    if (BAD_KEYWORDS.has(cleaned))
      continue;
    if (cleaned.length > 30)
      continue;
    keywords.push(token.trim());
  }
  return keywords.slice(0, maxTokens);
}
// src/runner.ts
function aggregateText(engines, results, query, numResults) {
  if (results.length === 0)
    return "";
  const weights = new Map(engines.map((e) => [e.name, e.config.weight]));
  const aggregated = exports_aggregator.aggregate(results, { weights, maxResults: numResults }, query);
  if (aggregated.length === 0)
    return "";
  return exports_aggregator.formatResults(aggregated, query);
}
function engineStats(engines, results, errors, elapsedMs) {
  const ok = new Set(results.map((r) => r.engine)).size;
  const failed = engines.length - ok;
  const parts2 = [`引擎 ${engines.length} 个`, `成功 ${ok}`, `失败 ${failed}`, `耗时 ${Math.round(elapsedMs / 1000)}s`];
  if (errors.length > 0)
    parts2.push(`错误 ${errors.length} 个`);
  return `[${parts2.join(" · ")}]`;
}
function listEngines() {
  return exports_selector.selectEngines().map((e) => ({
    name: e.name,
    requiresKey: e.config.requiresKey,
    weight: e.config.weight,
    timeoutMs: e.config.timeout
  }));
}
function getStatus() {
  return {
    rateLimiter: exports_rate_limiter.getGlobalRateLimiter().getStatus(),
    cache: { size: exports_cache.globalResultCache.size, hitRate: exports_cache.globalResultCache.hitRate },
    engines: Object.fromEntries(exports_executor.getGlobalState().engineStatuses)
  };
}
function searchWeb(params, signal, onProgress) {
  const query = params.query.trim();
  if (!query)
    return Promise.resolve("ERROR: query 不能为空");
  const program = exports_Effect.gen(function* () {
    const http = yield* exports_HttpClient.HttpClient;
    const startedAt = Date.now();
    const intent = exports_query_intent.detectQueryIntent(query);
    const effectiveQueryType = params.queryType || intent.queryType || "general";
    const hasUserFilters = params.queryType !== undefined || params.timeRange !== undefined || params.lang !== undefined;
    let engines = hasUserFilters ? exports_selector.selectEngines({ queryType: effectiveQueryType, timeRange: params.timeRange, lang: params.lang }) : exports_selector.selectEngines();
    if (params.engines && params.engines.length > 0) {
      const wanted = new Set(params.engines);
      const picked = engines.filter((e) => wanted.has(e.name));
      const missing = params.engines.filter((n) => !engines.some((e) => e.name === n));
      if (picked.length === 0) {
        return `ERROR: 指定的引擎均不存在: ${missing.join(", ")}。可用引擎列表见 web_search_status。`;
      }
      engines = picked;
      if (missing.length > 0) {
        return `ERROR: 以下引擎不存在,已忽略: ${missing.join(", ")}。可用引擎列表见 web_search_status。`;
      }
    }
    if (engines.length === 0)
      return "没有可用的搜索引擎。";
    const numResults = params.numResults && params.numResults > 0 ? Math.min(params.numResults, 50) : 8;
    const opts = exports_engine.makeSearchOptions({ numResults, timeRange: params.timeRange, lang: params.lang });
    const cacheKey = exports_cache.ResultCache.makeKey(query, { numResults, timeRange: params.timeRange, lang: params.lang });
    const cached3 = exports_cache.globalResultCache.get(cacheKey);
    if (cached3 && cached3.length > 0) {
      const text3 = aggregateText(engines, cached3, query, numResults);
      const stats2 = engineStats(engines, cached3, [], Date.now() - startedAt);
      if (text3)
        return `${stats2}

[缓存命中] ${text3}`;
    }
    const state = exports_executor.getGlobalState();
    const onEngineProgress = (info) => {
      if (!onProgress)
        return;
      onProgress({
        done: info.done,
        total: info.total,
        current: info.current,
        phase: info.phase,
        partialCount: info.partialResults.length,
        latestResults: info.partialResults.slice(-5).reverse().map((r) => ({ title: r.title, url: r.url, engine: r.engine }))
      });
    };
    const execEffect = exports_executor.executeAll(engines, http, query, opts, state, onEngineProgress);
    const execResult = params.maxWaitSeconds && params.maxWaitSeconds > 0 ? yield* execEffect.pipe(exports_Effect.timeout(`${params.maxWaitSeconds} seconds`)) : yield* execEffect;
    if (!execResult) {
      return `搜索超过 ${params.maxWaitSeconds} 秒未完成(共 ${engines.length} 个引擎,每个引擎上限 15 秒)。可调大 maxWaitSeconds,或传 engines 指定引擎子集加速。`;
    }
    if (execResult.results.length > 0)
      exports_cache.globalResultCache.set(cacheKey, execResult.results);
    const stats = engineStats(engines, execResult.results, execResult.errors, Date.now() - startedAt);
    const text2 = aggregateText(engines, execResult.results, query, numResults);
    return `${stats}

${text2 || "未找到搜索结果。请尝试其他查询词。"}`;
  });
  if (signal && signal.aborted) {
    return Promise.reject(new Error("search aborted"));
  }
  return exports_Effect.runPromise(exports_Effect.provide(program, exports_FetchHttpClient.layer), signal ? { signal } : undefined);
}
export {
  searchWeb,
  listEngines,
  getStatus
};
