<script>
	import { useExpressStore } from '@/stores/express'
	import { checkAndLoadSms } from '@/utils/smsParser'

	// 应用全局入口
	export default {
		onLaunch: function() {
			console.log('===== [取件码助手] App Launch =====')
			try {
				const store = useExpressStore()
				store.loadFromStorage()
			} catch (e) {
				console.warn('[App] Pinia初始化失败：', e)
			}
		},
		onShow: function() {
			console.log('===== [取件码助手] App Show - 开始扫描短信 =====')
			checkAndLoadSms(true).then(res => {
				console.log('[App] 扫描完成，返回值：', JSON.stringify(res))
			}).catch(err => {
				console.warn('[App] 扫描短信失败：', err)
			})
			// 进入前台时触发一次超时检查（含系统通知）
			try {
				const store = useExpressStore()
				store.checkTimeout(false)
			} catch (e) {
				console.warn('[App] 超时检查失败：', e)
			}
		},
		onHide: function() {
			console.log('[取件码助手] App Hide')
		}
	}
</script>

<style>
	page {
		background-color: #F8F8F8;
		font-family: -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Microsoft YaHei', sans-serif;
	}
</style>
