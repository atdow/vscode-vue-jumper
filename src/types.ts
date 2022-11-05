/*
 * @Author: atdow
 * @Date: 2022-11-05 17:41:00
 * @LastEditors: null
 * @LastEditTime: 2022-11-05 18:21:03
 * @Description: file description
 */
export interface IAliasConfigsItem {
  alias: string
  target: string
}

export interface ILineInfo {
  type: string
  path: string
  originPath: string
}
