import Sortable, { AutoScroll } from 'sortablejs/modular/sortable.core.esm'

let isAutoScrollMounted = false

if (!isAutoScrollMounted) {
  Sortable.mount(new AutoScroll())
  isAutoScrollMounted = true
}

export default Sortable
