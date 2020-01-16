"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.createResolvers = exports.createSchemaCustomization = exports.createPages = void 0;

var _gatsbyNodeHelpers = _interopRequireDefault(require("gatsby-node-helpers"));

var _lunr = _interopRequireDefault(require("lunr"));

var _flexsearch = _interopRequireDefault(require("flexsearch"));

var R = _interopRequireWildcard(require("ramda"));

var _lodash = _interopRequireDefault(require("lodash.lowerfirst"));

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) { var desc = Object.defineProperty && Object.getOwnPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : {}; if (desc.get || desc.set) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function asyncGeneratorStep(gen, resolve, reject, _next, _throw, key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { Promise.resolve(value).then(_next, _throw); } }

function _asyncToGenerator(fn) { return function () { var self = this, args = arguments; return new Promise(function (resolve, reject) { var gen = fn.apply(self, args); function _next(value) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "next", value); } function _throw(err) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "throw", err); } _next(undefined); }); }; }

function _objectWithoutProperties(source, excluded) { if (source == null) return {}; var target = _objectWithoutPropertiesLoose(source, excluded); var key, i; if (Object.getOwnPropertySymbols) { var sourceSymbolKeys = Object.getOwnPropertySymbols(source); for (i = 0; i < sourceSymbolKeys.length; i++) { key = sourceSymbolKeys[i]; if (excluded.indexOf(key) >= 0) continue; if (!Object.prototype.propertyIsEnumerable.call(source, key)) continue; target[key] = source[key]; } } return target; }

function _objectWithoutPropertiesLoose(source, excluded) { if (source == null) return {}; var target = {}; var sourceKeys = Object.keys(source); var key, i; for (i = 0; i < sourceKeys.length; i++) { key = sourceKeys[i]; if (excluded.indexOf(key) >= 0) continue; target[key] = source[key]; } return target; }

const TYPE_PREFIX = 'LocalSearch';
const TYPE_INDEX = 'Index';
const TYPE_STORE = 'Store';

const _createNodeHelpers = (0, _gatsbyNodeHelpers.default)({
  typePrefix: TYPE_PREFIX
}),
      generateTypeName = _createNodeHelpers.generateTypeName,
      generateNodeId = _createNodeHelpers.generateNodeId; // Returns an exported FlexSearch index using the provided documents, fields,
// and ref.


const createFlexSearchIndexExport = ({
  documents,
  fields,
  ref,
  options
}) => {
  const index = _flexsearch.default.create(options || {});

  documents.forEach(doc => index.add(doc[ref], JSON.stringify(R.pick(fields, doc))));
  return index.export();
}; // Returns an exported Lunr index using the provided documents, fields, and
// ref.


const createLunrIndexExport = ({
  documents,
  fields,
  ref
}) => {
  const index = (0, _lunr.default)(function () {
    this.ref(ref);
    fields.forEach(x => this.field(x));
    documents.forEach(x => this.add(x));
  });
  return JSON.stringify(index);
}; // Returns an exported index using the provided engine, documents, fields, and
// ref. Throws if the provided engine is invalid.


const createIndexExport = (_ref) => {
  let reporter = _ref.reporter,
      name = _ref.name,
      engine = _ref.engine,
      args = _objectWithoutProperties(_ref, ["reporter", "name", "engine"]);

  switch (engine) {
    case 'flexsearch':
      return createFlexSearchIndexExport(args);

    case 'lunr':
      return createLunrIndexExport(args);

    default:
      reporter.error(`The gatsby-plugin-local-search engine option for index "${name}" is invalid. Must be one of: flexsearch, lunr. The index will be null.`);
      return null;
  }
}; // Create index and store during createPages and save to cache. The cached
// values will be used in createResolvers.


const createPages =
/*#__PURE__*/
function () {
  var _ref2 = _asyncToGenerator(function* ({
    graphql,
    cache,
    reporter
  }, {
    name,
    ref = 'id',
    store: storeFields,
    index: indexFields,
    query,
    normalizer,
    engine,
    options
  }) {
    const result = yield graphql(query);
    if (result.errors) throw R.head(result.errors);
    const documents = yield Promise.resolve(normalizer(result));
    if (R.isEmpty(documents)) reporter.warn(`The gatsby-plugin-local-search query for index "${name}" returned no nodes. The index and store will be empty.`);
    const fields = R.reject(R.equals(ref), indexFields || R.pipe(R.head, R.keys)(documents));
    const index = createIndexExport({
      reporter,
      name,
      engine,
      documents,
      fields,
      ref,
      options
    }); // Default to all fields if storeFields is not provided

    const store = R.pipe(R.map(R.pick(storeFields || [...fields, ref])), R.indexBy(R.prop(ref)))(documents); // Save to cache to use later in GraphQL resolver.

    yield cache.set(generateNodeId(TYPE_INDEX, name), index);
    yield cache.set(generateNodeId(TYPE_STORE, name), store);
    return;
  });

  return function createPages(_x, _x2) {
    return _ref2.apply(this, arguments);
  };
}(); // Set the GraphQL type for LocalSearchIndex.


exports.createPages = createPages;

const createSchemaCustomization = ({
  actions: {
    createTypes
  },
  schema
}, {
  name
}) => {
  createTypes([schema.buildObjectType({
    name: generateTypeName(`${TYPE_INDEX} ${name}`),
    fields: {
      id: 'ID',
      engine: 'String',
      index: 'String',
      store: 'String'
    }
  })]);
};

exports.createSchemaCustomization = createSchemaCustomization;

const createResolvers =
/*#__PURE__*/
function () {
  var _ref3 = _asyncToGenerator(function* ({
    actions: {
      createTypes
    },
    createResolvers: _createResolvers,
    cache,
    schema
  }, {
    name,
    engine
  }) {
    _createResolvers({
      Query: {
        [(0, _lodash.default)(generateTypeName(name))]: {
          type: generateTypeName(`${TYPE_INDEX} ${name}`),
          resolve: function () {
            var _resolve = _asyncToGenerator(function* (_parent, _args, context) {
              const index = yield cache.get(generateNodeId(TYPE_INDEX, name));
              const store = yield cache.get(generateNodeId(TYPE_STORE, name));
              return {
                id: name,
                engine,
                index,
                store: JSON.stringify(store)
              };
            });

            function resolve(_x5, _x6, _x7) {
              return _resolve.apply(this, arguments);
            }

            return resolve;
          }()
        }
      }
    });

    return;
  });

  return function createResolvers(_x3, _x4) {
    return _ref3.apply(this, arguments);
  };
}();

exports.createResolvers = createResolvers;