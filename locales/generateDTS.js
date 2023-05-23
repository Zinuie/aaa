const fs = require('fs');
const yaml = require('js-yaml');
const ts = require('typescript');

function createMembers(record) {
	return Object.entries(record).map(([k, v]) => ts.factory.createPropertySignature(undefined, ts.factory.createStringLiteral(k), undefined, typeof v === 'string' ? ts.factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword) : ts.factory.createTypeLiteralNode(createMembers(v))));
}

module.exports = function generateDTS() {
	const locale = yaml.load(fs.readFileSync(`${__dirname}/ja-JP.yml`, 'utf-8'));
	const members = createMembers(locale);
	const elements = [
		ts.factory.createInterfaceDeclaration(
			[ts.factory.createToken(ts.SyntaxKind.ExportKeyword)],
			ts.factory.createIdentifier('Locale'),
			undefined,
			undefined,
			members,
		),
		ts.factory.createVariableStatement(
			[ts.factory.createToken(ts.SyntaxKind.DeclareKeyword)],
			ts.factory.createVariableDeclarationList(
				[ts.factory.createVariableDeclaration(
					ts.factory.createIdentifier('locales'),
					undefined,
					ts.factory.createTypeLiteralNode([ts.factory.createIndexSignature(
						undefined,
						[ts.factory.createParameterDeclaration(
							undefined,
							undefined,
							ts.factory.createIdentifier('lang'),
							undefined,
							ts.factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword),
							undefined,
						)],
						ts.factory.createTypeReferenceNode(
							ts.factory.createIdentifier('Locale'),
							undefined,
						),
					)]),
					undefined,
				)],
				ts.NodeFlags.Const | ts.NodeFlags.Ambient | ts.NodeFlags.ContextFlags,
			),
		),
		ts.factory.createExportAssignment(
			undefined,
			true,
			ts.factory.createIdentifier('locales'),
		),
	];
	const printed = ts.createPrinter({
		newLine: ts.NewLineKind.LineFeed,
	}).printList(
		ts.ListFormat.MultiLine,
		ts.factory.createNodeArray(elements),
		ts.createSourceFile('index.d.ts', '', ts.ScriptTarget.ESNext, true, ts.ScriptKind.TS),
	);

	fs.writeFileSync(`${__dirname}/index.d.ts`, printed, 'utf-8');
}
