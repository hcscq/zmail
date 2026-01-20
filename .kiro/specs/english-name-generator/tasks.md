# Implementation Plan: English Name Generator

## Overview

本实现计划将英文名邮箱生成器功能分解为可执行的编码任务。采用后端优先的方式，先实现核心生成逻辑，再扩展API，最后集成前端组件。

## Tasks

- [x] 1. 创建英文名生成器模块
  - [x] 1.1 创建名字库数据文件 `worker/src/data/names.ts`
    - 添加至少100个常见英文名字（firstNames数组）
    - 添加至少50个常见英文姓氏（lastNames数组）
    - 导出 NAME_POOL 常量
    - _Requirements: 2.1, 2.2_

  - [x] 1.2 实现名字地址生成器 `worker/src/name-generator.ts`
    - 实现 `getRandomFirstName()` 函数
    - 实现 `getRandomLastName()` 函数
    - 实现 `formatNameAddress()` 函数，支持四种格式
    - 实现 `generateNameAddress()` 主函数
    - 确保生成的地址为小写且长度在6-20字符之间
    - _Requirements: 2.3, 2.4, 2.5_

  - [ ]* 1.3 编写名字地址生成器的属性测试
    - **Property 1: Name Address Format Validity**
    - **Validates: Requirements 2.3, 2.4, 2.5**

  - [ ]* 1.4 编写名字池覆盖的属性测试
    - **Property 5: Name Pool Coverage**
    - **Validates: Requirements 2.1, 2.2**

- [x] 2. 扩展后端API
  - [x] 2.1 更新 `worker/src/utils.ts` 随机地址生成逻辑
    - 确保随机地址不以数字开头
    - 验证长度为8-12字符
    - _Requirements: 3.1, 3.2, 3.3_

  - [ ]* 2.2 编写随机地址格式的属性测试
    - **Property 2: Random Address Format Validity**
    - **Validates: Requirements 3.1, 3.2, 3.3**

  - [x] 2.3 实现地址验证函数 `worker/src/utils.ts`
    - 添加 `validateCustomAddress()` 函数
    - 验证字符集（字母、数字、点、下划线、连字符）
    - 验证长度（3-30字符）
    - 返回验证结果和错误信息
    - _Requirements: 4.2, 4.3_

  - [ ]* 2.4 编写自定义地址验证的属性测试
    - **Property 3: Custom Address Validation Consistency**
    - **Validates: Requirements 4.2, 4.3**

  - [x] 2.5 更新 `worker/src/routes.ts` 创建邮箱API
    - 接受 `addressType` 参数（name/random/custom）
    - 根据类型调用相应的生成器
    - 在响应中返回 `addressType` 字段
    - 处理自定义地址验证错误
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

  - [ ]* 2.6 编写API地址类型保持的属性测试
    - **Property 4: Address Type Preservation**
    - **Validates: Requirements 6.1, 6.5**

- [ ] 3. Checkpoint - 后端功能验证
  - 确保所有后端测试通过
  - 使用 curl 或 Postman 手动测试API
  - 如有问题请询问用户

- [x] 4. 实现前端组件
  - [x] 4.1 创建地址类型选择器组件 `frontend/src/components/AddressTypeSelector.tsx`
    - 实现三个选项按钮：英文名、随机、自定义
    - 支持选中状态样式
    - 支持禁用状态
    - 添加中英文国际化支持
    - _Requirements: 1.1, 5.1, 5.4_

  - [x] 4.2 创建地址预览组件 `frontend/src/components/AddressPreview.tsx`
    - 显示生成的地址和域名
    - 添加重新生成按钮
    - 支持加载状态
    - _Requirements: 5.2, 5.3_

  - [x] 4.3 创建自定义地址输入组件 `frontend/src/components/CustomAddressInput.tsx`
    - 实现实时验证
    - 显示验证错误信息
    - 支持中英文提示
    - _Requirements: 4.1, 4.4_

- [x] 5. 集成前端状态管理
  - [x] 5.1 更新 `frontend/src/utils/api.ts`
    - 修改 `createRandomMailbox()` 支持 addressType 参数
    - 添加 `generatePreviewAddress()` 函数用于预览
    - _Requirements: 6.1_

  - [x] 5.2 更新 `frontend/src/contexts/MailboxContext.tsx`
    - 添加 `addressType` 状态
    - 添加 `previewAddress` 状态
    - 实现 `setAddressType()` 方法
    - 实现 `generatePreviewAddress()` 方法
    - 实现 `createMailboxWithType()` 方法
    - 从 localStorage 读取/保存用户偏好
    - _Requirements: 1.2, 1.3, 1.4, 1.5_

- [x] 6. 集成到邮箱创建界面
  - [x] 6.1 更新 `frontend/src/components/HeaderMailbox.tsx` 或相关组件
    - 集成 AddressTypeSelector 组件
    - 集成 AddressPreview 组件
    - 集成 CustomAddressInput 组件（当选择自定义时显示）
    - 更新创建邮箱按钮逻辑
    - _Requirements: 5.1, 5.5_

  - [x] 6.2 添加国际化翻译
    - 更新 `frontend/i18n/locales/en.json`
    - 更新 `frontend/i18n/locales/zh-CN.json`
    - 添加所有新增UI文本的翻译
    - _Requirements: 5.4_

- [x] 7. Final Checkpoint - 完整功能验证
  - 确保所有测试通过
  - 验证前后端集成正常
  - 如有问题请询问用户

## Notes

- 标记 `*` 的任务为可选任务，可跳过以加快MVP开发
- 每个任务都引用了具体的需求条款以便追溯
- 属性测试使用 fast-check 库实现
- Checkpoint 任务用于阶段性验证
