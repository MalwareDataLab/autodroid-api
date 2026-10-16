# Mensagens de commit

O projeto usa o [Commitizen](https://github.com/commitizen/cz-cli) para montar a mensagem e o Conventional Commitlint para validá-la. O release-please usa essas mensagens para gerar o changelog e as versões.

Não desabilite essas ferramentas sem a aprovação da equipe. Para pular os hooks `pre-commit` (lint) e `commit-msg` (validação da mensagem) em um commit:

```git
git commit --no-verify
```
