# Tidy Dev

## Purpose

人間がシステムを理解するコストを抑えたい。
そのために、ソフトウェア開発の過程で作るドキュメント・コードのうち、恒久的に維持するものと一時的に作るものを分け、恒久的に残すものを小さく整理された状態を保つ。

## Principals

- コードで表現できるものは、コードをSource of Truthとする。同じ情報をドキュメントに書かない。
  - 外界とのContract: Schema, Interface
  - データモデル: Type, Interface
  - 詳細レベルの振る舞い: Tests
- ドキュメントにはコードでは表現できない将来も必要な知識を書く。
  - 存在意義
  - 外から見たシステムの振る舞い
  - アーキテクチャ、責任分界（外界とのContractやデータモデルはコードへのリファレンスとして示す）
  - 非自明な設計判断
  - 運用方法（デプロイ、設定変更など）
  - 制約

## Workflow

### Understand

解決すべき問題を理解するために、ユーザーとの議論やコードベースの調査を行う

Output:
- README.md#Purpose
- .work/<feat-name>-research.md

### Define Spec

外から見たシステムの振る舞いを整理する

Output:
- README.md#Behavior

### Design

システムを実現するためのアーキテクチャを設計する

Output:
- .work/<feat-name>-research.md (既存のソリューションや、利用可能な技術を調査)
- README.md#Architecture
- README.md#Decisions
- 外界とのContract (Code)
- データモデル (Code)

### Plan

具体的なタスクに分解

Output:
- .work/<feat-name>-tasks.md

### Implement

Output:
- Code & Tests
- README.md#Operations

### Tidy Up

恒久的に残すものを整理する

Output:
- 整理された README.md（Codeで説明可能な詳細を削除、実装との整合性を合わせる）
- 整理された Code & Tests（自明・冗長なコメントの削除、テストケースの同値クラスの重複削除）
- .work/ 配下の一時ファイル削除（全タスク完了後）
