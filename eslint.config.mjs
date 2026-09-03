import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import boundaries from "eslint-plugin-boundaries";

// FSD 레이어 의존성 방향: app -> pages -> widgets -> features -> entities -> shared.
// 상위 레이어는 하위 레이어를 import할 수 있지만, 그 반대(하위가 상위를 import)는 금지.
// entities끼리는 서로 참조 가능(예: post가 category를 참조) — FSD에서 흔히 허용되는 예외.
// 설계 근거 상세: docs/FSD.md
const fsdBoundaries = defineConfig([
  {
    plugins: { boundaries },
    settings: {
      "boundaries/include": ["src/**/*"],
      "boundaries/elements": [
        { type: "app", pattern: "src/app/**" },
        // FSD의 "pages" 레이어. 폴더명은 src/views — src/pages는 Next.js Pages Router와
        // 이름이 겹쳐서 라우팅 충돌이 나기 때문에 피함 (FSD 개념상 이름은 그대로 "pages").
        { type: "pages", pattern: "src/views/*" },
        { type: "widgets", pattern: "src/widgets/*" },
        { type: "features", pattern: "src/features/*" },
        { type: "entities", pattern: "src/entities/*" },
        { type: "shared", pattern: "src/shared/**" },
      ],
    },
    rules: {
      "boundaries/dependencies": [
        "error",
        {
          default: "disallow",
          policies: [
            {
              from: { element: { type: "app" } },
              allow: {
                to: {
                  element: {
                    types: { anyOf: ["app", "pages", "widgets", "features", "entities", "shared"] },
                  },
                },
              },
            },
            {
              from: { element: { type: "pages" } },
              allow: {
                to: { element: { types: { anyOf: ["widgets", "features", "entities", "shared"] } } },
              },
            },
            {
              from: { element: { type: "widgets" } },
              allow: { to: { element: { types: { anyOf: ["features", "entities", "shared"] } } } },
            },
            {
              from: { element: { type: "features" } },
              allow: { to: { element: { types: { anyOf: ["entities", "shared"] } } } },
            },
            {
              from: { element: { type: "entities" } },
              allow: { to: { element: { types: { anyOf: ["entities", "shared"] } } } },
            },
            {
              from: { element: { type: "shared" } },
              allow: { to: { element: { type: "shared" } } },
            },
          ],
        },
      ],
    },
  },
]);

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  ...fsdBoundaries,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
