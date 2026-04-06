//前端调用逻辑
打开游戏的接口
enum level {
quiz = 1,
person2D = 2,
}

person2D接口
// 直接调用，立刻切换动画
window.teacherAPI.playIdle1() // 切到待机1
window.teacherAPI.playIdle2() // 切到待机2
window.teacherAPI.playTalk() // 切到说话
window.teacherAPI.playTalkImmediately() // 切到立刻说话
window.teacherAPI.playTalkCompletely() // 切到完整说话
window.teacherAPI.stop() // 停止当前动画

window.teacherAPI.play(type)//播放制定动画,type是下面的枚举，同时也是上面五个动作，用play或者用特定动作都可以。
export enum Animation2DType {
IDLE1 = 1,
IDLE2 = 2,
TALK = 3,
TALK_IMMEDIATELY = 4,
TALK_COMPLETELY = 5,
}

---

//后端接口数据

## 问答（Quiz）数据接口

与 `assets/Scripts/CoreManager/Quiz/QuizExamples.ts` 中 `QuizDataImpl` 构造参数一致，用于描述一套问答游戏及其题目、选项。

### QuizData（一套问答）

| 字段        | 类型                              | 说明                          |
| ----------- | --------------------------------- | ----------------------------- |
| `id`        | `string`或者`int`（最好是srting） | 问答唯一标识，如 `math_quiz`  |
| `name`      | `string`                          | 展示用名称，如 `数学专项测试` |
| `questions` | `QuizQuestion[]`                  | 题目列表，至少 1 道           |

### QuizQuestion（单题）

| 字段             | 类型                               | 说明                                                  |
| ---------------- | ---------------------------------- | ----------------------------------------------------- |
| `id`             | `string`或者`int` （最好是srting） | 题目唯一标识                                          |
| `question`       | `string`                           | 题干文案                                              |
| `subject`        | `string`                           | 科目/主题，如 `数学`                                  |
| `knowledgePoint` | `string`                           | 知识点标签                                            |
| `hint`           | `string`                           | 提示文案                                              |
| `options`        | `QuizOption[]`                     | 选项列表，至少 2 个，且须恰好有一个 `isCorrect: true` |

### QuizOption（选项）

| 字段        | 类型                              | 说明           |
| ----------- | --------------------------------- | -------------- |
| `id`        | `string`或者`int`（最好是srting） | 选项唯一标识   |
| `text`      | `string`                          | 选项展示文本   |
| `isCorrect` | `boolean`                         | 是否为正确答案 |

### 示例（数学专项，与示例数据同结构）

```json
{
  "id": "math_quiz",
  "name": "数学专项测试",
  "questions": [
    {
      "id": "math_1",
      "question": "以下哪个是质数？",
      "subject": "数学",
      "knowledgePoint": "质数的定义",
      "hint": "质数是指大于1的自然数，除了1和它本身外，不能被其他自然数整除的数",
      "options": [
        { "id": "math_1_1", "text": "15", "isCorrect": false },
        { "id": "math_1_2", "text": "23", "isCorrect": true },
        { "id": "math_1_3", "text": "49", "isCorrect": false },
        { "id": "math_1_4", "text": "1", "isCorrect": false }
      ]
    },
    {
      "id": "math_2",
      "question": "圆的面积公式是什么？",
      "subject": "数学",
      "knowledgePoint": "圆的面积计算",
      "hint": "圆的面积与半径的平方成正比",
      "options": [
        { "id": "math_2_1", "text": "πr²", "isCorrect": true },
        { "id": "math_2_2", "text": "2πr", "isCorrect": false },
        { "id": "math_2_3", "text": "πd", "isCorrect": false },
        { "id": "math_2_4", "text": "πr", "isCorrect": false }
      ]
    }
  ]
}
```
