import { Sparkles, Play, Download, Film } from 'lucide-react';

function App() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto text-center">
          <div className="flex items-center justify-center gap-3 mb-6">
            <Sparkles className="text-blue-400" size={48} />
            <h1 className="text-6xl font-bold text-white">SVG 视频生成器</h1>
          </div>

          <p className="text-2xl text-slate-300 mb-12">
            用 AI 将你的想法转化为精美的 SVG 动画视频
          </p>

          <div className="bg-slate-800/50 backdrop-blur rounded-2xl p-12 mb-12 border border-slate-700">
            <h2 className="text-3xl font-semibold text-white mb-6">使用流程</h2>

            <div className="grid md:grid-cols-3 gap-8 text-left">
              <div className="flex flex-col items-center">
                <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center mb-4">
                  <Sparkles size={32} className="text-white" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">1. 生成内容</h3>
                <p className="text-slate-400 text-center">
                  使用 Gamma AI 创建带有矢量插图的演示文稿
                </p>
              </div>

              <div className="flex flex-col items-center">
                <div className="w-16 h-16 bg-indigo-500 rounded-full flex items-center justify-center mb-4">
                  <Play size={32} className="text-white" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">2. 预览动画</h3>
                <p className="text-slate-400 text-center">
                  实时观看 SVG 流畅的动画效果
                </p>
              </div>

              <div className="flex flex-col items-center">
                <div className="w-16 h-16 bg-violet-500 rounded-full flex items-center justify-center mb-4">
                  <Download size={32} className="text-white" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">3. 导出视频</h3>
                <p className="text-slate-400 text-center">
                  渲染高质量视频文件，随时分享
                </p>
              </div>
            </div>
          </div>

          <a
            href="/editor.html"
            className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xl font-semibold rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all shadow-2xl hover:shadow-blue-500/50"
          >
            <Sparkles size={24} />
            开始创作
          </a>

          <a
            href="/film.html"
            className="mt-6 flex items-center justify-center gap-3 text-lg text-slate-300 transition-colors hover:text-white"
          >
            <Film size={20} />
            观看示例短片《父与子》 Father and Son
          </a>
        </div>
      </div>
    </div>
  );
}

export default App;
