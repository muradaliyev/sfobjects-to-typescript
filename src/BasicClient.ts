import "dotenv/config";
import jsforce, { Connection } from "jsforce";
import { Account, Date_Types_Account } from "./interfaces/Account";
import { Date_Types_frm_Allocation__c, frm_Allocation__c } from "./interfaces/frm_Allocation__c";
import { Date_Types_frm_Grant__c, frm_Grant__c } from "./interfaces/frm_Grant__c";
import _ from "lodash";


export interface SfObject<O = {}, DK = string> {
    ObjectType: O;
    DateKeys: DK;
}

export type SfObjectsIndex = {
    'frm_Grant__c': SfObject<frm_Grant__c, Date_Types_frm_Grant__c>,
    'frm_Allocation__c': SfObject<frm_Allocation__c, Date_Types_frm_Allocation__c>,
    'Account': SfObject<Account, Date_Types_Account>
}

type GetObjectTypes<OI extends Record<string, SfObject>> = { [K in keyof OI]: GetObjType<OI, K> }[keyof OI];
type GetObjType<OI extends Record<string, SfObject>, K extends keyof OI> = OI[K]['ObjectType'];
type GetObjDateKeys<OI extends Record<string, SfObject>, K extends keyof OI> = OI[K]['DateKeys'];


//export type GetSfObjects<OI extends Record<string, SfObject>> = { [K in keyof OI]: OI[K]['ObjectType'] };

//export type ObjectTypes<OI extends Record<string, SfObject>> = { [K in keyof OI]: OI[K]['ObjectType'] }[keyof OI];

//export type SfObjects = GetSfObjects<SfObjectsIndex>





// **** Common types

// OT = available object types coming from SfObjects index, ie (Account | frm_Grant__c | frm_Allocation__c)


export type SingleOrArray<T> = (T | T[]);

export type SfPrimitiveType = string | number | boolean | bigint;

export type OnlyObjects<S> = S extends object ? S : never;

export type OnlyStrings<S> = S extends string ? S : never;



export interface BaseSfObject { readonly Id: string; }

export type ChildTable<OT = object> = { totalSize: number, done: boolean, records: OT[] }

export interface SfSelectStatement<T = any> { select: T[]; }
export interface SfWhereStatement<T = any> { where?: T; }

//export type OnlyStringKeys<OM> = { [K in keyof OM as K extends string ? K : never]: OM[K] }


// Where


const OP_KEY_AND = '__and';
const OP_KEY_OR = '__or';
const OP_KEY_NOT = '__not';

const OP_KEYS_EQ = ['eq', 'equals', '=', '=='] as const;
const OP_KEYS_NE = ['ne', '!=', '<>'] as const;
const OP_KEYS_LT = ['lt', '<', 'less than'] as const;
const OP_KEYS_LTE = ['lte', '<=', 'less than or equal'] as const;
const OP_KEYS_GT = ['gt', '>', 'greater than'] as const;
const OP_KEYS_GTE = ['gte', '>=', 'greater than or equal'] as const;
const OP_KEYS_IN = ['in'] as const;
const OP_KEYS_NIN = ['nin', 'not in'] as const;
const OP_KEYS_LIKE = ['like'] as const;
const OP_KEYS_NLIKE = ['nlike', 'not like'] as const;


const SINGULAR_OP_KEYS = [
    ...OP_KEYS_EQ,
    ...OP_KEYS_NE,
    ...OP_KEYS_LT,
    ...OP_KEYS_GT,
    ...OP_KEYS_LTE,
    ...OP_KEYS_GTE,
    ...OP_KEYS_LIKE,
    ...OP_KEYS_NLIKE
] as const;

const PLURAL_OP_KEYS = [
    ...OP_KEYS_IN,
    ...OP_KEYS_NIN
] as const;

const LOGICAL_OP_KEYS = [
    OP_KEY_AND,
    OP_KEY_OR,
    OP_KEY_NOT
] as const;

type SfSingularOpKeys = typeof SINGULAR_OP_KEYS[number];
type SfPluralOpKeys = typeof PLURAL_OP_KEYS[number];
type SfLogicalOpKeys = typeof LOGICAL_OP_KEYS[number];


interface SfOpRule {
    ops: readonly (SfSingularOpKeys | SfPluralOpKeys)[];
    isNot?: boolean;
    isPlural?: boolean;
    soqlOp: string;
}

const OP_RULES: SfOpRule[] = [
    { ops: OP_KEYS_EQ, soqlOp: '=' },
    { ops: OP_KEYS_NE, soqlOp: '!=' },
    { ops: OP_KEYS_LT, soqlOp: '<' },
    { ops: OP_KEYS_LTE, soqlOp: '<=' },
    { ops: OP_KEYS_GT, soqlOp: '>' },
    { ops: OP_KEYS_GTE, soqlOp: '>=' },
    { ops: OP_KEYS_IN, soqlOp: 'in', isPlural: true },
    { ops: OP_KEYS_NIN, soqlOp: 'in', isNot: true, isPlural: true },
    { ops: OP_KEYS_LIKE, soqlOp: 'like' },
    { ops: OP_KEYS_NLIKE, soqlOp: 'like', isNot: true },
]

export interface SfSingularWhereOp<OP extends SfSingularOpKeys, V> {
    op: OP;
    value: V;
}

export interface SfPluralWhereOp<OP extends SfPluralOpKeys, V> {
    op: OP;
    values: V;
}

export type SfPrimitiveWhereKeys<O> = { [K in keyof O]: NonNullable<O[K]> extends SfPrimitiveType ? K : never }[keyof O];

export type SfParentRelWhereKeys<O, OT> = { [K in keyof O]: NonNullable<O[K]> extends OT ? K : never }[keyof O];

export type ValOrDate<O, K extends keyof O, DT> = K extends DT ? Date : O[K];

export type SfPrimitiveWhere<O, DT> = {
    [K in SfPrimitiveWhereKeys<O>]+?: ValOrDate<O, K, DT> | { [OPK in SfSingularOpKeys]: SfSingularWhereOp<OPK, ValOrDate<O, K, DT>> }[SfSingularOpKeys] | { [OPK in SfPluralOpKeys]: SfPluralWhereOp<OPK, ValOrDate<O, K, DT>[]> }[SfPluralOpKeys]
}

export type SfParentRelWhere<O, OT, DT> = {
    [K in SfParentRelWhereKeys<O, OT>]+?: SfWhere<NonNullable<O[K]>, OT, DT>
}

export type SfLogicalWhere<O, OT, DT> = {
    [K in SfLogicalOpKeys]: SfWhere<O, OT, DT>;
}

export type SfWhere<O, OT, DT> = SfPrimitiveWhere<O, DT> | SfParentRelWhere<O, OT, DT> | SfLogicalWhere<O, OT, DT>;


// select

export type SfSelectAndWhereParts<O, OT, DT> = SfSelectStatement<SfSelection<O, OT, DT>> & SfWhereStatement<SfWhere<O, OT, DT>>;
//export type SfSelectAndWhereParts<O, OT, DT> = SfSelectStatement<SfSelection<O, OT, DT>> &  { where?: SfWhere<O, OT, DT>; };


export type SfChildRelSelection<O, OT, DT> = {
    [K in keyof O]: NonNullable<O[K]> extends ChildTable<OT> ? { [P in K]: SfSelectAndWhereParts<NonNullable<O[K]>['records'][0], OT, DT> | SfSelection<NonNullable<O[K]>['records'][0], OT, DT>[] } : never
}[keyof O];


export type SParentRelSelection<O, OT, DT> = {
    [K in keyof O]: NonNullable<O[K]> extends OT ? { [P in K]: SfSelection<NonNullable<O[K]>, OT, DT>[] } : never
}[keyof O];


export type SfPrimitiveSelection<O> = {
    [K in keyof O]: NonNullable<O[K]> extends SfPrimitiveType ? K : never
}[keyof O];


export type SfSelection<O, OT, DT> = SParentRelSelection<O, OT, DT> | SfChildRelSelection<O, OT, DT> | SfPrimitiveSelection<O>;



// Root Query


export interface SfQueryFromPart<N> { from: N; }

export type SfSelectionFromIndex<OI extends Record<string, SfObject>, N extends OnlyStrings<keyof OI>> = SfSelection<GetObjType<OI, N>, GetObjectTypes<OI>, GetObjDateKeys<OI, N>>;

export type SfWhereFromIndex<OI extends Record<string, SfObject>, N extends OnlyStrings<keyof OI>> = SfWhere<GetObjType<OI, N>, GetObjectTypes<OI>, GetObjDateKeys<OI, N>>;


export type SfRootQuery<OI extends Record<string, SfObject>> = {
    [N in OnlyStrings<keyof OI>]: SfSelectStatement<SfSelectionFromIndex<OI, N>> & SfWhereStatement<SfWhereFromIndex<OI, N>> & SfQueryFromPart<N>
}[OnlyStrings<keyof OI>]


// projection


export type SfPrjPrimitiveKeys<O, S> = { [K in keyof O]: S extends K ? NonNullable<O[K]> extends SfPrimitiveType ? K : never : never }[keyof O];

export type SfPrjParentRelKeys<O, S> = { [K in keyof O]: S extends object ? { [SK in Extract<keyof S, K>]: NonNullable<O[K]> extends object ? NonNullable<O[K]> extends ChildTable ? never : K : never }[Extract<keyof S, K>] : never }[keyof O];

export type SfPrjChildRelKeys<O, S> = { [K in keyof O]: S extends object ? { [SK in Extract<keyof S, K>]: NonNullable<O[K]> extends ChildTable ? K : never }[Extract<keyof S, K>] : never }[keyof O];


export type SfPrimitiveSelectProjection<O, S> = { [K in SfPrjPrimitiveKeys<O, S>]: O[K] };

export type SfParentRelSelectProjection<O, S extends object> = {
    [K in SfPrjParentRelKeys<O, S>]: {
        [SK in Extract<keyof S, K>]: NonNullable<S[SK]> extends any[] ? SfSelectProjection<NonNullable<O[SK]>, NonNullable<S[SK]>[0]> : NonNullable<S[SK]> extends SfSelectStatement ? never : never
    }[Extract<keyof S, K>]
};

export type SfChildRelSelectProjection<O, S extends object> = {
    [K in SfPrjChildRelKeys<O, S>]: {
        [SK in Extract<keyof S, K>]: NonNullable<S[SK]> extends SfSelectStatement ? NonNullable<O[SK]> extends ChildTable ? ChildTable<SfSelectProjection<NonNullable<O[SK]>['records'][0], NonNullable<S[SK]>['select'][0]>> : never : never
    }[Extract<keyof S, K>]
};


export type SfSelectProjection<O, S> = SfPrimitiveSelectProjection<O, OnlyStrings<S>> & SfParentRelSelectProjection<O, OnlyObjects<S>> & SfChildRelSelectProjection<O, OnlyObjects<S>>;

export type SfQueryProjection<OI extends Record<string, SfObject>, Q extends SfRootQuery<OI>> = SfSelectProjection<GetObjType<OI, Q['from']>, Q['select'][0]>;


// Utils


function pluralize<T>(v: SingleOrArray<T>): T[] {

    if (v !== undefined) {
        return _.isArray(v) ? v : [v];
    }

    return [];
}

function escapeVal(v: any): string {

    if (typeof v === 'string') {
        return `'${v}'`;
    }

    if (_.isDate(v)) {
        return v.toDateString();
    }

    if (typeof v === 'boolean' || typeof v === 'number' || typeof v === 'bigint') {
        return String(v);
    }

    if (v === null) {
        return 'null';
    }

    throw `Unupported value type for where statement`;

}

function processWhereStatement(where: Record<string, any>, o?: { prefixes?: string[], isLogicalOr?: boolean, isLogicalNot?: boolean }) {

    const { prefixes, isLogicalNot, isLogicalOr } = o || {};

    const whereStatements = _(where)
        .map((v, k): (string | undefined) => {

            if (_.includes(LOGICAL_OP_KEYS, k)) {

                if (_.isPlainObject(v)) {
                    return processWhereStatement(v, { prefixes, isLogicalOr: (k === OP_KEY_OR), isLogicalNot: (k === OP_KEY_NOT) });
                }
            }

            else {

                if (_.isPlainObject(v)) {

                    const { op, value, values, ...rest } = v;

                    const _value = values ?? value;

                    if (op !== undefined && _value !== undefined) {

                        const opRule = OP_RULES.find(r => r.ops.some(rop => (rop === op)));

                        if (opRule) {

                            const { soqlOp, isNot, isPlural } = opRule;

                            if ((isPlural ?? false) === _.isArray(_value)) {


                                return _([
                                    isNot ? 'not (' : '',
                                    [...(prefixes || []), k].join('.'),
                                    soqlOp,
                                    Array.isArray(_value) ? `(${_value.map(escapeVal).join(',')})` : escapeVal(_value),
                                    isNot ? ')' : '',
                                ]).compact().join(' ');
                            }
                        }
                    }

                    else if (op === undefined && value === undefined) {

                        return processWhereStatement(rest, { prefixes: [...(prefixes || []), k] })
                    }

                }
                else if (_.isArray(v)) {
                    return `${k} in (${v.map(escapeVal).join(',')})`;
                }
                else {
                    return `${k} = ${escapeVal(v)}`;
                }
            }
        })
        .compact()
        .value();


    if (whereStatements.length) {

        const joinedStatements = `(${whereStatements.join(isLogicalOr ? ') or (' : ') and (')})`;

        if (isLogicalNot) {
            return whereStatements.length > 1 ? `not (${joinedStatements})` : `not ${joinedStatements}`;
        }

        return joinedStatements;
    }
}


function constructWhereStatement(where?: string | Record<string, any>) {

    if (where) {

        if (typeof where === 'string') {
            return where;
        }

        const whereSt = processWhereStatement(where);

        if (whereSt?.length) {
            return `where ${whereSt}`;
        }
    }
}

function constructFullQuery(from: string, select: (string | {})[], where?: string | Record<string, any>): string {

    return [
        'select',
        constructSelectStatement(select),
        'from',
        from,
        constructWhereStatement(where)
    ]
        .filter(Boolean)
        .join(' ');
}


function constructSelectStatement(select: (string | {})[], prefixes: string[] = []): string {

    return select
        .map(st => {

            if (typeof st === 'string') {
                return [...prefixes, st].join('.');
            }

            if (_.isPlainObject(st)) {

                return _(st)
                    .map((rst, rsk) => {

                        if (Array.isArray(rst)) {
                            return constructSelectStatement(rst, [...prefixes, rsk])
                        }

                        if (_.isPlainObject(rst)) {

                            const { select, where } = rst;


                            if (Array.isArray(select)) {
                                return `(${constructFullQuery(rsk, select, where)})`;
                            }

                            // throw error???
                        }

                    })
                    .filter(Boolean)
                    .join(',');
            }
        })
        .filter(Boolean)
        .join(',');

}

export class BasicClient<OI extends Record<string, SfObject>> {


    constructor(protected _conn: Connection) { }


    exec<Q extends SfRootQuery<OI>>(query: Q) {
        return this._conn.query<SfQueryProjection<OI, Q>>(this.soql(query));
    }

    soql<Q extends SfRootQuery<OI>>(query: Q) {
        const { select, from, where } = query;
        return constructFullQuery(from, select, where);
    }

    query<Q extends SfRootQuery<OI>>(query: Q) {

        return ({
            query: () => query,
            exec: () => this.exec(query),
            soql: () => this.soql(query),
        })
    }

    select<N extends OnlyStrings<keyof OI>, S extends SfSelectionFromIndex<OI, N>>(from: N, pSelect: SingleOrArray<S>) {

        const select = pluralize(pSelect);

        return {
            select: <NS extends SfSelectionFromIndex<OI, N>>(nSelect: SingleOrArray<NS>) => this.select(from, [...select, ...pluralize(nSelect)]),
            where: <W extends SfWhereFromIndex<OI, N>>(where: W) => this.query({ from, select, where }),
            ...this.query({ from, select })
        }
    };


    from<N extends OnlyStrings<keyof OI>>(from: N) {
        return {
            select: <S extends SfSelectionFromIndex<OI, N>>(select: SingleOrArray<S>) => this.select(from, select)
        }
    };

}


function getRequiredParam(p: string) {
    const v = process.env[p];

    if (!v) {
        throw `Unknown param [${p}]`
    }

    return v;
}



async function run() {

    try {

        const conn = new jsforce.Connection();

        await conn.login(getRequiredParam('USERNAME'), getRequiredParam('PASSWORD'));

        const sf = new BasicClient<SfObjectsIndex>(conn)

        const qr = sf
            .from('frm_Grant__c')
            .select(['Active__c', 'Stage__c'])
            .select(['Agreement__c'])
            .select({
                'Allocations__r': {
                    'select': [
                        'Agreement__c',
                        'Amount_LC__c'
                    ]
                }
                
            })
            .where({ Id: 'a2xVj000000xieYIAQ' })



        console.log(qr.soql());

        const rr = await qr.exec();

        console.log(rr.records[0].Stage__c);

        console.log(rr.records);
    }
    catch (err) {
        console.error(err);
    }



}

run();

