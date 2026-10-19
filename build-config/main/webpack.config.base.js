const path = require('path')
const ESLintPlugin = require('eslint-webpack-plugin')

const isDev = process.env.NODE_ENV === 'development'

module.exports = {
  target: 'electron-main',
  output: {
    filename: '[name].js',
    // 主进程和渲染进程都输出到 dist，默认异步分包都是 [id].js。
    // 并行打包时渲染进程会覆盖主进程分包（music-metadata 即其中之一）。
    // 首次扫描没有缓存的目录时，主进程 require 到渲染进程分包并失败，歌曲列表为空。
    // 数据库 worker 仍使用固定文件名，避免破坏现有加载路径。
    chunkFilename: (pathData) => {
      if (pathData.chunk?.name === 'dbService.worker') return '[name].js'
      return 'main.[id].js'
    },
    library: {
      type: 'commonjs2',
    },
    path: path.join(__dirname, '../../dist'),
  },
  externals: {
    'font-list': 'font-list',
    'better-sqlite3': 'better-sqlite3',
    'electron-font-manager': 'electron-font-manager',
    bufferutil: 'bufferutil',
    'utf-8-validate': 'utf-8-validate',
    'qrc_decode.node': isDev ? path.join(__dirname, '../../build/Release/qrc_decode.node') : path.join('../build/Release/qrc_decode.node'),
  },
  resolve: {
    alias: {
      '@main': path.join(__dirname, '../../src/main'),
      '@renderer': path.join(__dirname, '../../src/renderer'),
      '@lyric': path.join(__dirname, '../../src/renderer-lyric'),
      '@common': path.join(__dirname, '../../src/common'),
    },
    extensions: ['.tsx', '.ts', '.js', '.mjs', '.json', '.node'],
  },
  module: {
    rules: [
      {
        test: /\.node$/,
        use: 'node-loader',
      },
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
  plugins: [
    new ESLintPlugin(),
  ],
}
