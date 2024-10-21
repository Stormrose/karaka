/**
 * Filtrex provides compileExpression() to compile user expressions to JavaScript.
 * See https://github.com/joewalnes/filtrex for tutorial, reference and examples.
 * MIT License.
 * -Joe Walnes
 */
/* Updates to make into an importable typescript module by eturnerx: March 2021 */

import { Parser } from 'jison'
export let filtrexparser: any

export default function compileExpression(expression: string, extraFunctions?: { [T: string]: Function } ): Function {
    const functions: { [T: string]: Function } = {
        abs: Math.abs,
        ceil: Math.ceil,
        floor: Math.floor,
        log: Math.log,
        max: Math.max,
        min: Math.min,
        random: Math.random,
        round: Math.round,
        sqrt: Math.sqrt,
        clamp: clamp,
    }
    if (extraFunctions) {
        for (const fname of Object.keys(extraFunctions)) {
            if (extraFunctions.hasOwnProperty(fname)) {
                functions[fname] = extraFunctions[fname];
            }
        }
    }

    // Building the original parser is the heaviest part. Do it once and cache the result.
    if (!filtrexparser) filtrexparser = filtrexParser()
    var tree = filtrexparser.parse(expression)

    var js = [];
    js.push('return ')
    function toJs(node:any) {
        if (Array.isArray(node)) {
            node.forEach(toJs)
        } else {
            js.push(node)
        }
    }
    tree.forEach(toJs)
    js.push(';')

    function unknown(funcName:string) {
        throw 'Unknown function: ' + funcName + '()'
    }

    function prop(obj:object, name: string): any {
        //@ts-ignore: {} causes problems
        return Object.prototype.hasOwnProperty.call(obj || {}, name) ? obj[name] : undefined
    }

    var func = new Function('functions', 'data', 'unknown', 'prop', js.join(''))

    return function(data:any) {
        return func(functions, data, unknown, prop);
    }
}

function filtrexParser() {
    // Language parser powered by Jison <http://zaach.github.com/jison/>,
    // which is a pure JavaScript implementation of
    // Bison <http://www.gnu.org/software/bison/>.

    function code(args:(number|string)[], skipParentheses:Boolean = false) {
        var argsJs = args.map(function(a) {
            return typeof(a) == 'number' ? ('$' + a) : JSON.stringify(a);
        }).join(',');

        return skipParentheses
                ? '$$ = [' + argsJs + '];'
                : '$$ = ["(", ' + argsJs + ', ")"];';
    }

    var grammar = {
        // Lexical tokens
        lex: {
            rules: [
                ['\\*', 'return "*";'],
                ['\\/', 'return "/";'],
                ['-'  , 'return "-";'],
                ['\\+', 'return "+";'],
                ['\\^', 'return "^";'],
                ['\\%', 'return "%";'],
                ['\\(', 'return "(";'],
                ['\\)', 'return ")";'],
                ['\\,', 'return ",";'],
                ['==', 'return "==";'],
                ['\\!=', 'return "!=";'],
                ['\\~=', 'return "~=";'],
                ['>=', 'return ">=";'],
                ['<=', 'return "<=";'],
                ['<', 'return "<";'],
                ['>', 'return ">";'],
                ['\\?', 'return "?";'],
                ['\\:', 'return ":";'],
                ['and[^\\w]', 'return "and";'],
                ['or[^\\w]' , 'return "or";'],
                ['not[^\\w]', 'return "not";'],
                ['in[^\\w]', 'return "in";'],

                ['\\s+',  ''], // skip whitespace
                ['[0-9]+(?:\\.[0-9]+)?\\b', 'return "NUMBER";'], // 212.321

                ['[a-zA-Z][\\.a-zA-Z0-9_]*',
                 `yytext = JSON.stringify(yytext);
                  return "SYMBOL";`
                ], // some.Symbol22

                [`'(?:[^\'])*'`,
                 `yytext = JSON.stringify(
                     yytext.substr(1, yyleng-2)
                  );
                  return "SYMBOL";`
                ], // 'some-symbol'

                ['"(?:[^"])*"',
                 `yytext = JSON.stringify(
                     yytext.substr(1, yyleng-2)
                  );
                  return "STRING";`
                ], // "foo"

                // End
                ['$', 'return "EOF";'],
            ]
        },
        // Operator precedence - lowest precedence first.
        // See http://www.gnu.org/software/bison/manual/html_node/Precedence.html
        // for a good explanation of how it works in Bison (and hence, Jison).
        // Different languages have different rules, but this seems a good starting
        // point: http://en.wikipedia.org/wiki/Order_of_operations#Programming_languages
        operators: [
            ['left', '?', ':'],
            ['left', 'or'],
            ['left', 'and'],
            ['left', 'in'],
            ['left', '==', '!=', '~='],
            ['left', '<', '<=', '>', '>='],
            ['left', '+', '-'],
            ['left', '*', '/', '%'],
            ['left', '^'],
            ['left', 'not'],
            ['left', 'UMINUS'],
        ],
        // Grammar
        bnf: {
            expressions: [ // Entry point
                ['e EOF', 'return $1;']
            ],
            e: [
                ['e + e'  , code([1, '+', 3])],
                ['e - e'  , code([1, '-', 3])],
                ['e * e'  , code([1, '*', 3])],
                ['e / e'  , code([1, '/', 3])],
                ['e % e'  , code([1, '%', 3])],
                ['e ^ e'  , code(['Math.pow(', 1, ',', 3, ')'])],
                ['- e'    , code(['-', 2]), {prec: 'UMINUS'}],
                ['e and e', code(['Number(', 1, '&&', 3, ')'])],
                ['e or e' , code(['Number(', 1, '||', 3, ')'])],
                ['not e'  , code(['Number(!', 2, ')'])],
                ['e == e' , code(['Number(', 1, '==', 3, ')'])],
                ['e != e' , code(['Number(', 1, '!=', 3, ')'])],
                ['e ~= e' , code(['RegExp(', 3, ').test(', 1, ')'])],
                ['e < e'  , code(['Number(', 1, '<' , 3, ')'])],
                ['e <= e' , code(['Number(', 1, '<=', 3, ')'])],
                ['e > e'  , code(['Number(', 1, '> ', 3, ')'])],
                ['e >= e' , code(['Number(', 1, '>=', 3, ')'])],
                ['e ? e : e', code([1, '?', 3, ':', 5])],
                ['( e )'  , code([2])],
                ['NUMBER' , code([1])],
                ['STRING' , code([1])],
                ['SYMBOL' , code(['prop(data, ', 1, ')'])],
                ['SYMBOL ( )', code(['(functions.hasOwnProperty(', 1, ') ? functions[', 1, ']() : unknown(', 1, '))'])],
                ['SYMBOL ( argsList )', code(['(functions.hasOwnProperty(', 1, ') ? functions[', 1, '](', 3, ') : unknown(', 1, '))'])],
                ['e in ( inSet )', code(['(function(o) { return ', 4, '; })(', 1, ')'])],
                ['e not in ( inSet )', code(['!(function(o) { return ', 5, '; })(', 1, ')'])],
            ],
            argsList: [
                ['e', code([1], true)],
                ['argsList , e', code([1, ',', 3], true)],
            ],
            inSet: [
                ['e', code(['o ==', 1], true)],
                ['inSet , e', code([1, '|| o ==', 3], true)],
            ],
        }
    };
    return new Parser(grammar);
}

function clamp(min: number, value: number, max: number): number {
    return Math.max(min, Math.min(value, max))
}
