<template>
  <teleport :to="teleport">
    <div v-if="showModal" ref="dom_container" :class="$style.container">
      <transition enter-active-class="animated fadeIn" leave-active-class="animated fadeOut">
        <div v-show="showContent" :class="[$style.modal, {[$style.filter]: filter}]" @click="bgClose && close()">
          <transition :enter-active-class="inClass" :leave-active-class="outClass" @after-enter="$emit('after-enter', $event)" @after-leave="handleAfterLeave">
            <div
              v-show="showContent"
              ref="dom_content"
              :class="[$style.content, {[$style.dragging]: isDragging}]"
              :style="contentStyle"
              @click.stop
              @mousedown="handleContentMouseDown"
            >
              <header :class="[$style.header, {[$style.movableHeader]: movable}]" data-modal-drag>
                <button v-if="closeBtn" type="button" data-no-drag @click="close" @mousedown.stop>
                  <svg version="1.1" xmlns="http://www.w3.org/2000/svg" xlink="http://www.w3.org/1999/xlink" height="100%" viewBox="0 0 212.982 212.982" space="preserve">
                    <use xlink:href="#icon-delete" />
                  </svg>
                </button>
              </header>
              <slot />
            </div>
          </transition>
        </div>
      </transition>
    </div>
  </teleport>
</template>

<script>
import { getRandom } from '@common/utils/common'
import { nextTick } from '@common/utils/vueTools'
import { appSetting } from '@renderer/store/setting'

let modalCount = 0
export default {
  props: {
    show: {
      type: Boolean,
      default: false,
    },
    closeBtn: {
      type: Boolean,
      default: true,
    },
    bgClose: {
      type: Boolean,
      default: false,
    },
    movable: {
      type: Boolean,
      default: false,
    },
    teleport: {
      type: String,
      default: '#root',
    },
    maxWidth: {
      type: String,
      default: '76%',
    },
    minWidth: {
      type: String,
      default: '280px',
    },
    maxHeight: {
      type: String,
      default: '76%',
    },
    width: {
      type: String,
      default: 'auto',
    },
    height: {
      type: String,
      default: 'auto',
    },
  },
  emits: ['after-enter', 'after-leave', 'close'],
  data() {
    return {
      animates: [
        [['jackInTheBox', 'flipInX', 'flipInY', 'lightSpeedIn'], ['flipOutX', 'flipOutY', 'lightSpeedOut']],
        // [['jackInTheBox', 'lightSpeedIn'], ['lightSpeedOut']],
        [['rotateInDownLeft', 'rotateInDownRight', 'rotateInUpLeft', 'rotateInUpRight'], ['rotateOutDownLeft', 'rotateOutDownRight', 'rotateOutUpLeft', 'rotateOutUpRight']],
        [['jackInTheBox', 'zoomInDown', 'zoomInUp'], ['zoomOutDown', 'zoomOutUp']],
        [['slideInDown', 'slideInLeft', 'slideInRight', 'slideInUp'], ['slideOutDown', 'slideOutLeft', 'slideOutRight', 'slideOutUp']],

        // ['flipInX', 'flipOutX'],
        // ['flipInY', 'flipOutY'],
        // ['lightSpeedIn', 'lightSpeedOut'],
        // ['rotateInDownLeft', 'rotateOutDownLeft'],
        // ['rotateInDownRight', 'rotateOutDownRight'],
        // ['rotateInUpLeft', 'rotateOutUpLeft'],
        // ['rotateInUpRight', 'rotateOutUpRight'],
        // // ['rollIn', 'rollOut'],
        // // ['zoomIn', 'zoomOut'],
        // ['zoomInDown', 'zoomOutDown'],
        // // ['zoomInLeft', 'zoomOutLeft'],
        // // ['zoomInRight', 'zoomOutRight'],
        // ['zoomInUp', 'zoomOutUp'],
        // ['slideInDown', 'slideOutDown'],
        // ['slideInLeft', 'slideOutLeft'],
        // ['slideInRight', 'slideOutRight'],
        // ['slideInUp', 'slideOutUp'],
        // // ['jackInTheBox', 'hinge'],
      ],
      // animateIn: [
      //   'flipInX',
      //   'flipInY',
      //   // 'fadeIn',
      //   // 'bounceIn',
      //   'lightSpeedIn',
      //   'rotateInDownLeft',
      //   'rotateInDownRight',
      //   'rotateInUpLeft',
      //   'rotateInUpRight',
      //   'rollIn',
      //   'zoomIn',
      //   'zoomInDown',
      //   'zoomInLeft',
      //   'zoomInRight',
      //   'zoomInUp',
      //   'slideInDown',
      //   'slideInLeft',
      //   'slideInRight',
      //   'slideInUp',
      //   'jackInTheBox',
      // ],
      // animateOut: [
      //   'flipOutX',
      //   'flipOutY',
      //   // 'fadeOut',
      //   // 'bounceOut',
      //   'lightSpeedOut',
      //   'rotateOutDownLeft',
      //   'rotateOutDownRight',
      //   'rotateOutUpLeft',
      //   'rotateOutUpRight',
      //   'rollOut',
      //   'zoomOut',
      //   'zoomOutDown',
      //   'zoomOutLeft',
      //   'zoomOutRight',
      //   'zoomOutUp',
      //   'slideOutDown',
      //   'slideOutLeft',
      //   'slideOutRight',
      //   'slideOutUp',
      //   'hinge',
      // ],
      inClass: 'animated jackInTheBox',
      outClass: 'animated slideOutRight',
      showModal: false,
      showContent: false,
      modalCount: false,
      isAddedClass: false,
      // ai: 0,
      dragOffsetX: 0,
      dragOffsetY: 0,
      isDragging: false,
      dragStartX: 0,
      dragStartY: 0,
      dragOriginX: 0,
      dragOriginY: 0,
      dragBaseLeft: 0,
      dragBaseTop: 0,
      dragWidth: 0,
      dragHeight: 0,
    }
  },
  computed: {
    contentStyle() {
      const style = {
        maxWidth: this.maxWidth,
        minWidth: this.minWidth,
        width: this.width,
        height: this.height,
        maxHeight: this.maxHeight,
      }
      if (this.movable && (this.dragOffsetX || this.dragOffsetY)) {
        // 用 left/top 避免与进场动画的 transform 冲突
        style.left = `${this.dragOffsetX}px`
        style.top = `${this.dragOffsetY}px`
      }
      return style
    },
    filter() {
      return this.teleport == '#root' || this.modalCount > 1
    },
  },
  watch: {
    show(val) {
      this.handleShowChange(val)
    },
  },
  mounted() {
    if (this.show) this.handleShowChange(true)
    this.setRandomAnimation()
  },
  created() {
    this.onDragMove = (event) => {
      this.handleDragMove(event)
    }
    this.onDragEnd = () => {
      this.handleDragEnd()
    }
  },
  beforeUnmount() {
    this.removeDragListeners()
    this.removeClass()
  },
  methods: {
    handleShowChange(val) {
      if (val) {
        // const dom = document.getElementById(this.teleport)
        // if (dom) {
        //   // dom.t
        // }
        this.resetDragOffset()
        this.setRandomAnimation()
        this.modalCount = ++modalCount
        this.showModal = true
        void nextTick(() => {
          const node = this.$refs.dom_container.parentNode
          if (!node.classList.contains('show-modal')) {
            node.classList.add('show-modal')
            this.isAddedClass = true
          }
          this.showContent = true
        })
      } else {
        if (modalCount > 0) this.modalCount = --modalCount
        this.removeDragListeners()
        this.removeClass()
        this.showContent = false
      }
    },
    removeClass() {
      if (!this.isAddedClass) return
      this.$refs.dom_container?.parentNode.classList.remove('show-modal')
    },
    setRandomAnimation() {
      if (appSetting['common.randomAnimate']) {
        const [animIn, animOut] = this.animates[getRandom(0, this.animates.length)]
        // const [animIn, animOut] = this.animates[this.ai]
        // if (++this.ai >= this.animates.length) this.ai = 0
        // console.log(animIn, animOut)
        // this.inClass = 'animated ' + animIn
        // this.outClass = 'animated ' + animOut
        this.inClass = 'animated ' + animIn[getRandom(0, animIn.length)]
        this.outClass = 'animated ' + animOut[getRandom(0, animOut.length)]
      }
    },
    close() {
      this.$emit('close')
    },
    handleAfterLeave(event) {
      this.$emit('after-leave', event)
      this.showModal = false
      this.resetDragOffset()
    },
    resetDragOffset() {
      this.dragOffsetX = 0
      this.dragOffsetY = 0
      this.isDragging = false
    },
    handleContentMouseDown(event) {
      if (!this.movable || event.button !== 0) return
      const target = event.target
      if (!(target instanceof Element)) return
      if (target.closest('[data-no-drag], button, input, textarea, select, a, label')) return
      if (!target.closest('[data-modal-drag]')) return
      this.startDrag(event)
    },
    startDrag(event) {
      const content = this.$refs.dom_content
      if (!content) return
      const rect = content.getBoundingClientRect()
      this.isDragging = true
      this.dragStartX = event.clientX
      this.dragStartY = event.clientY
      this.dragOriginX = this.dragOffsetX
      this.dragOriginY = this.dragOffsetY
      this.dragBaseLeft = rect.left - this.dragOffsetX
      this.dragBaseTop = rect.top - this.dragOffsetY
      this.dragWidth = rect.width
      this.dragHeight = rect.height
      document.addEventListener('mousemove', this.onDragMove)
      document.addEventListener('mouseup', this.onDragEnd)
      event.preventDefault()
    },
    handleDragMove(event) {
      if (!this.isDragging) return
      const container = this.$refs.dom_container
      if (!container) return

      let nextX = this.dragOriginX + (event.clientX - this.dragStartX)
      let nextY = this.dragOriginY + (event.clientY - this.dragStartY)

      // 保证弹窗至少留出一部分在可视区域内
      const minVisible = 48
      const containerRect = container.getBoundingClientRect()
      const left = this.dragBaseLeft + nextX
      const top = this.dragBaseTop + nextY
      const right = left + this.dragWidth
      const bottom = top + this.dragHeight

      if (right < containerRect.left + minVisible) {
        nextX += (containerRect.left + minVisible) - right
      } else if (left > containerRect.right - minVisible) {
        nextX += (containerRect.right - minVisible) - left
      }
      if (bottom < containerRect.top + minVisible) {
        nextY += (containerRect.top + minVisible) - bottom
      } else if (top > containerRect.bottom - minVisible) {
        nextY += (containerRect.bottom - minVisible) - top
      }

      this.dragOffsetX = nextX
      this.dragOffsetY = nextY
    },
    handleDragEnd() {
      this.isDragging = false
      this.removeDragListeners()
    },
    removeDragListeners() {
      document.removeEventListener('mousemove', this.onDragMove)
      document.removeEventListener('mouseup', this.onDragEnd)
    },
  },
}
</script>


<style lang="less" module>
@import '@renderer/assets/styles/layout.less';

.container {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 99;
}

.modal {
  width: 100%;
  height: 100%;
  // background-color: rgba(0, 0, 0, .2);
  // background-color: rgba(255, 255, 255, .6);
  // background-color: var(--color-primary-light-600-alpha-900);
  // backdrop-filter: blur(4px);
  // backdrop-filter: grayscale(70%);
  display: grid;
  align-items: center;
  justify-items: center;
  // will-change: transform;

  &.filter {
    backdrop-filter: grayscale(70%);
  }

  // &:before {
  //   .mixin-after();
  //   position: absolute;
  //   left: 0;
  //   top: 0;
  //   width: 100%;
  //   height: 100%;
  //   background-color: var(--color-000);
  //   opacity: .6;
  // }
}

.content {
  position: relative;
  border-radius: 4px;
  box-shadow: 0 0 4px rgba(0, 0, 0, .25);
  overflow: hidden;
  // max-height: 80%;
  // max-width: 76%;
  min-width: 220px;
  position: relative;
  display: flex;
  flex-flow: column nowrap;
  z-index: 100;
  background-color: var(--color-content-background);

  &.dragging {
    user-select: none;
  }
}

.header {
  flex: none;
  background-color: var(--color-primary-light-100-alpha-100);
  display: flex;
  align-items: center;
  justify-content: flex-end;
  height: 18px;

  &.movableHeader {
    height: 22px;
    cursor: move;
  }

  button {
    border: none;
    cursor: pointer;
    padding: 4px 7px;
    background-color: transparent;
    color: var(--color-primary-dark-500-alpha-500);
    outline: none;
    transition: background-color 0.2s ease;
    line-height: 0;

    svg {
      height: .7em;
    }

    &:hover {
      background-color: var(--color-primary-dark-100-alpha-600);
    }
    &:active {
      background-color: var(--color-primary-dark-200-alpha-600);
    }
  }
}

</style>
