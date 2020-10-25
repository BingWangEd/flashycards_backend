module.exports = {
    "env": {
        "browser": true,
				"es2021": true,
				"node": true
    },
    "extends": [
        "eslint:recommended",
        "plugin:@typescript-eslint/recommended"
    ],
    "parser": "@typescript-eslint/parser",
    "parserOptions": {
        "ecmaVersion": 12
    },
    "plugins": [
        "@typescript-eslint"
    ],
    "rules": {
			"no-useless-constructor": "off",
			"consistent-return": "off",
			"import/no-unresolved": "off",
			"no-unused-vars": "off",
			"no-console": "off",
			"camelcase": "off",
			"no-empty": "off",
			"no-empty-function": "off",
			"no-multi-str": "off",
			"arrow-body-style": "off"
    }
};
