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
  - 振る舞い
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

システムとしてどう振る舞うべきかを整理する

Output:
- 概要レベル README.md#Behavior
- 詳細レベル テストコード（まだ実装がないので、コメントとして）

### Design

Output:
- README.md#Architecture
- 外界とのContract (Code)
- データモデル (Code)
- README.md#Decisions

### Plan

Output:
- .work/<feat-name>-tasks.md

### Implement

Output:
- Code & Tests
