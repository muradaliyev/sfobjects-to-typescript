"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.exctract = exctract;
const fs = __importStar(require("fs"));
const extractTypes_1 = require("./extractTypes");
const SfConnector_1 = require("./SfConnector");
const generateIndex_1 = require("./generateIndex");
function exctract(o) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            console.log('Logging in...');
            const sf = new SfConnector_1.SfConnector(o);
            yield sf.login();
            const u = yield sf.getIdentity();
            console.log(`id: ${u.id}, org Id: ${u.organization_id}`);
            const typesIndex = (yield Promise.all(yield o.objects.map((k) => __awaiter(this, void 0, void 0, function* () {
                console.log(`Fetching metadata for object ${k}...`);
                return { k, d: yield sf.describeObject(k) };
            }))))
                .reduce((p, v) => (Object.assign(Object.assign({}, p), { [v.k]: v.d })), {});
            // if (!otherTypeNames.some(t => (t === 'RecordType'))) {
            //     otherTypeNames.push('RecordType');
            // }
            const recTypeDevNames = {};
            const instance = sf.auth.instance_url;
            function _store(name, body) {
                return __awaiter(this, void 0, void 0, function* () {
                    if (o.output) {
                        const fName = [o.output, `${name}.ts`].filter(Boolean).join('/');
                        console.log(`Saving '${fName}'...`);
                        yield fs.promises.writeFile(fName, body);
                    }
                    else {
                        console.log(body);
                    }
                });
            }
            for (var objectName in typesIndex) {
                // console.log(`Fetching metadata for object ${objectName}...`);
                // const describe = await sf.describeObject(objectName);
                const describe = typesIndex[objectName];
                if (!describe) {
                    throw `Unable to describe ${objectName}`;
                }
                console.log(`Generatting type ${objectName}...`);
                recTypeDevNames[objectName] = {};
                for (var ri of describe.recordTypeInfos) {
                    recTypeDevNames[objectName][ri.recordTypeId] = ri.master ? 'Master' : (yield sf.getRecordTypeById(ri.recordTypeId)).DeveloperName;
                }
                yield _store(describe.name, (0, extractTypes_1.extractTypes)({ describe, otherTypeNames: Object.keys(typesIndex), recTypeDevNames: recTypeDevNames[objectName], instance }));
            }
            console.log(`Generating index...`);
            yield _store('index', (0, generateIndex_1.generateIndex)(typesIndex, recTypeDevNames, instance));
            console.log('Done!');
        }
        catch (err) {
            console.log(`!!!Error: ${err}`);
        }
    });
}
