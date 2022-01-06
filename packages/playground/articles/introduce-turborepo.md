---
title: "turborepo で monorepo の差分ビルド"
emoji: "🌟"
type: "tech" # tech: 技術記事 / idea: アイデア
topics: [turborepo, monorepo, node]
published: true
---

[Turborepo](https://turborepo.org/)

vercel が開発した monorepo 環境のためのビルドツールです。vercel ですが next 非依存です。

# turorepo が何を解決するか

node.js に限らず monorepo 環境下では、それぞれの内部モジュールのビルドは個別に行われることが多いです。ここでいう内部モジュールは、 package.json を持つディレクトリ単位、と捉えてもらって結構です。

```
apps/
  web/
    package.json # => foo, bar を参照
packages/
  foo/
    package.json
    dist/
      index.js
  bar/
    package.json # => foo を参照
    dist/
      index.js
package.json
```

このビルドが、(ビルドしない素の js と比べて)面倒な問題を引き起こします。

- 更新時にビルドを忘れて古いビルドを参照してしまう、間違ったビルドを行ってしまう
- それを防ぐために本来不要なはずのビルドタスクを常に流してしまう
- CI のフルビルドで、何度も同じパッケージをビルドしてしまう
- ビルド順を間違えてそもそも各パッケージをどのようにビルドするかを調べるのが面倒

とかそういう諸々の問題です。

turborepo はこの問題を解決するためのビルドツールだと自分は認識しています。node monorepo 内の依存グラフを構築し、各パッケージごとの変更を監視して、現在の変更に対して必要なビルドタスクを流すように調整します。(ドキュメントによると並列プロセスの最適化等もやっているようです)

余談ですが、自分は内部パッケージはビルドせずに TypeScript のまま扱ってこの問題を避けていますが、ツールチェインの都合上、どうしてもビルドが必要になるケースは発生します。

## 他のツールとの優位点

make のタスクの依存でタスクの重複は省いてくれますが、ビルドのスキップは自分でロジックを書く必要があります。

Gradle や Bazel は同じ問題を解決してくれますが、 node で使うにはかなり冗長で記述量も増えます。node 用ではないので API のミスマッチ感もあります。

turborepo と同じく node 用のものとしては nx がありますが、nx の要求す規約に従う必要があり、リポジトリ新規作成時以外で導入するのが難しいと感じています。(が、エアプなので識者のコメントがほしい)

[Nx: Smart, Fast and Extensible Build System](https://nx.dev/)

turborepo とほぼ同じコンセプトのものに、拙作の [bincr](https://zenn.dev/mizchi/articles/introduce-bincr) というのがあるんですが、依存グラフを持っておらず、かわりにハッシュ計算に自分のソースコード以外に依存のビルド成果物を参照する運用をしていました。turborepo は変更監視に `.gitignore` を参照してます。

自分が turborepo が良いと思った点は、 turborepo の導入が npm/yarn/lerna の workspace の有効化するさえしていれば、他の要求が少ない点です。あとは基本的にコマンドの叩き方で制御でき、 wsrun や yarn workspaces run をキャッシュ付きで管理している、という感覚で扱えます。

## 使ってみる

スクラッチなら `npx create-turbo@latest` でディレクトリを生成するだけなんですが、それだと自分は turborepo で 何が制御されてるかわからなかったので、理解のためにスクラッチでリポジトリを作って導入してみました。

先程例に挙げたようなモノレポ構造を作ります。 `apps/*` は省きました。

```
packages/
  foo/
    package.json
    dist/
      index.js
  bar/
    package.json # => foo を参照
    dist/
      index.js
.gitignore
package.json
```

```
mkdir try-turbo && cd try-turbo
yarn init -y

mkdir -p packages/foo packages/bar apps/web
cd packages/foo && yarn init -y
cd packages/bar && yarn init -y
cd apps/web && yarn init -y
```

プロジェクトルートの package.json を次のように記述します。 この設定では `packages/*` をモジュールとして認識します。

```json:package.json
{
  "name": "monorepo-root",
  "version": "0.0.0",
  "private": true,
  "workspaces": [
    "packages/*"
  ],
  "scripts": {
    "build": "turbo run build"
  },
  "devDependencies": {
    "turbo": "latest"
  },
  "turbo": {
    "baseBranch": "origin/main",
    "pipeline": {
      "build": {
        "dependsOn": [
          "^build"
        ]
      }
    }
  }
}
```

この状態で一度 `npm/yarn install` すると、 パッケージ間参照が有効になります。これ自体は npm/yarn の機能で、turborepo の機能ではありません。

turbo は package.json 内にビルドパイプラインを記述します。これは最小限の例で `turbo run build` が使える設定です。 baseBranch は `origin/master` 以外に設定している際に追加してください。

`^build` は各モジュールで npm run build(yarn build) のタスクを流す、という意味です。(実際にはその前後に実行が必要かどうかの判定を行います)

turbo の変更検知のために、 `.gitignore` に `.turbo` を追加します。これは監視対象のハッシュが格納されています。

```
# .gitignore
dist
node_modules
.turbo
```

出力ディレクトリをハッシュ計算対象から除くために、 `dist` や `build`, `.next` などを追加します。

この時点ではまだ build タスクを持つモジュールがないので、今回は 雑に esbuild のバンドル機能を使います。

```bash
cd packages/foo
yarn add esbuild -D
```

```ts:packages/foo/index.ts
export const foo: number = 1;
```

```json:packages/foo/package.json
{
  "name": "foo",
  "version": "1.0.0",
  "main": "dist/index.js",
  "scripts": {
    "build": "esbuild index.ts --bundle --outfile=dist/index.js --format=esm"
  },
  "devDependencies": {
    "esbuild": "^0.14.10"
  },
  "license": "MIT"
}
```

この状態でプロジェクトルートで `yarn build` すると、 turbo が foo の変更を検知してビルドを行います。

```
$ yarn build
yarn run v1.22.17
$ turbo run build
• Packages in scope: foo
• Running build in 1 packages
foo:build: cache miss, executing a078fd7ae8dc2ff6
foo:build: $ esbuild index.ts --bundle --outfile=dist/index.js --format=esm
foo:build:
foo:build:   dist/index.js  43b
foo:build:

 Tasks:    1 successful, 1 total
Cached:    0 cached, 1 total
  Time:    430ms
```

2 回目は変更がないのでビルドはスキップされます

```
$ yarn build
yarn run v1.22.17
$ turbo run build
• Packages in scope: foo
• Running build in 1 packages
foo:build: cache hit, replaying output a078fd7ae8dc2ff6
foo:build: $ esbuild index.ts --bundle --outfile=dist/index.js --format=esm
foo:build:
foo:build:   dist/index.js  43b
foo:build:

 Tasks:    1 successful, 1 total
Cached:    1 cached, 1 total
  Time:    24ms >>> FULL TURBO
```

1 cached になりました。前回のビルドコマンド結果を再表示していますが、ビルドはスキップされました。

適当に foo を変更して再ビルドします。

```ts:packages/foo/index.ts
export const foo: number = 1.1; // 1 => 1.1
```

```
$ yarn build
yarn run v1.22.17
$ turbo run build
• Packages in scope: foo
• Running build in 1 packages
foo:build: cache miss, executing e6e3717869758b18
foo:build: $ esbuild index.ts --bundle --outfile=dist/index.js --format=esm
foo:build:
foo:build:   dist/index.js  45b
foo:build:

 Tasks:    1 successful, 1 total
Cached:    0 cached, 1 total
  Time:    231ms
```

変更が検知されたので再ビルドされました。

ここまでは簡単ですね。

foo を利用する bar のビルドタスクを追加します。

```ts:packages/bar/pacakge.json
{
  "name": "bar",
  "version": "1.0.0",
  "main": "dist/index.js",
  "scripts": {
    "build": "esbuild index.ts --bundle --outfile=dist/index.js --format=esm"
  },
  "devDependencies": {
    "foo": "*",
    "esbuild": "^0.14.10"
  },
  "license": "MIT",
}
```

```ts:packages/bar/index.ts
import { foo } from "foo";

export const bar = foo + 1;
```

foo を参照して foo + 1 を返すだけのコードです。

これを `turbo run build` します。

```
$ yarn build
yarn run v1.22.17
$ turbo run build
• Packages in scope: bar, foo
• Running build in 2 packages
bar:build: cache miss, executing 31c08f60022b24e8
foo:build: cache hit, replaying output e6e3717869758b18
foo:build: $ esbuild index.ts --bundle --outfile=dist/index.js --format=esm
foo:build:
foo:build:   dist/index.js  45b
foo:build:
bar:build: $ esbuild index.ts --bundle --outfile=dist/index.js --format=esm
bar:build:
bar:build:   dist/index.js  89b
bar:build:

 Tasks:    2 successful, 2 total
Cached:    1 cached, 2 total
  Time:    382ms
```

bar:build が cache miss になり、ビルドされます。 foo は再利用されています。
もう一度ビルドすると、 bar も cached になります。

```
$ turbo run build
• Packages in scope: bar, foo
• Running build in 2 packages
foo:build: cache hit, replaying output e6e3717869758b18
foo:build: $ esbuild index.ts --bundle --outfile=dist/index.js --format=esm
foo:build:
foo:build:   dist/index.js  45b
foo:build:
bar:build: cache hit, replaying output 31c08f60022b24e8
bar:build: $ esbuild index.ts --bundle --outfile=dist/index.js --format=esm
bar:build:
bar:build:   dist/index.js  89b
bar:build:

 Tasks:    2 successful, 2 total
Cached:    2 cached, 2 total
  Time:    27ms >>> FULL TURBO
```

ここで foo を変更して `turbo run build` すると、依存グラフに基づいて foo, bar の順番で再ビルドされます。

```
$ turbo run build
• Packages in scope: bar, foo
• Running build in 2 packages
foo:build: cache miss, executing e964f596aa9c4e13
foo:build: $ esbuild index.ts --bundle --outfile=dist/index.js --format=esm
foo:build:
foo:build:   dist/index.js  45b
foo:build:
bar:build: cache miss, executing a62b31205d11fcb8
bar:build: $ esbuild index.ts --bundle --outfile=dist/index.js --format=esm
bar:build:
bar:build:   dist/index.js  89b
bar:build:

 Tasks:    2 successful, 2 total
Cached:    0 cached, 2 total
  Time:    428ms
```

…という感じで最小限の手数で、宣言に基づいてビルドを実行してくれます。

今回はとても単純な例で説明しましたが、実際にはこれが巨大な依存として表現されるので、理想的なケースでは zero config で済みますが、実際には冪等性の管理が難しくなるだろう、という予感はあります。ソースコード外で表現される冪等性がないリソース参照のハッシュを都度自前で生成してハッシュ計算に巻き込む、みたいな下処理が必要になるかもしれません。

## Remote Caching (Beta)

Nx にもある機能なのですが、 turborepo にはビルド済みの cache をクラウド経由で sync する、という機能があります。

つまり、誰かがその状態で一度ビルドしたことがあったら、手元でビルドしたことがなくても、そのビルドキャッシュを再利用できます。 例えば git pull 直後なんかはだいたい cache が効くわけです。(ただし環境差分があると同じ状態にはならないでしょうが)

で、 turborepo が vercel で提供されてる理由がここで vercel が remote cache を無料で提供してくれています。雑に使ってみた感じ、個人アカウント or
team 単位で cache を共有できます。

remote cache 自体は無料ですが、 この team は一人あたり $20/mo per member です。 https://vercel.com/pricing

クラウドとしての vercel を使ってる人なら実質無料で、remote caching のためだけ使うために入ってもいいけどそれには過剰なので vercel の機能使いたいね、と誘導するためのマネタイズポイントですね。

https://turborepo.org/docs/features/remote-caching

## まとめ

- workspace を導入しているならシュッと導入できる
- お行儀よいコードは簡単に差分ビルドできるが、外部参照がある場合はちょっと面倒かも
- remote caching はこれ単独で使うにはちょっと高い

自分は monorepo 環境ならとりあえず雑に突っ込んでいこうと思いました。
