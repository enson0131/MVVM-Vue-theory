const compileUtil = {
    getValue (expr, vm) {
        return expr.split(".").reduce((data, currentVal) => {
            return data[currentVal]
        }, vm.$data)
    },
    setValue (expr, vm, inpulValue) {
        return expr.split(".").reduce((data, currentVal) => {
            typeof data[currentVal] != 'object' ? (data[currentVal] = inpulValue) : '';
            return data[currentVal]
        }, vm.$data)
    },
    getContentVal (expr, vm) {
        return expr.replace(/\{\{(.+?)\}\}/g, (...args) => {
            return this.getValue(args[1], vm);
        })
    },
    text (node, expr, vm) { // expr:msg, vm:当前的实例 {{}}
        // const value = vm.$data[expr]; // 这种方式不严谨，有可能是person.name
        // console.log("value", value)
        let value;
        if (expr.indexOf('{{') != -1) {
            // {{persion.name}} --- {{persion.age}}
            value = expr.replace(/\{\{(.+?)\}\}/g, (...args) => {
                // console.log(args)
                new Watcher(vm, args[1], (newValue) => {
                    this.updater.textUpdater(node, this.getContentVal(expr, vm));
                })
                return this.getValue(args[1], vm);
            })
        }else{
            value = this.getValue(expr, vm);
            new Watcher(vm, expr, (newValue) => {
                this.updater.textUpdater(node, newValue);
            })
        }
        this.updater.textUpdater(node,value);
    },
    html (node, expr, vm) {
        const value = this.getValue(expr, vm);
        new Watcher(vm, expr, (newValue) => {
            this.updater.htmlUpdater(node, newValue);
        })
        this.updater.htmlUpdater(node, value);
    },
    model (node, expr, vm) {
        const value = this.getValue(expr, vm);
        new Watcher(vm, expr, (newValue) => {
            this.updater.modelUpdater(node, newValue);
        })
        this.updater.modelUpdater(node, value);
        node.addEventListener('input', (e)=> {
            this.updater.modelUpdater(node, this.setValue(expr, vm, e.srcElement.value))
        }, false)
    },
    on (node, expr, vm, eventName){
        const fn = vm.$options.methods && vm.$options.methods[expr]
        node.addEventListener(eventName, fn.bind(vm), false)
    },
    // 更新的对象
    updater: {
        textUpdater(node, value) {
            node.textContent = value;
        },
        htmlUpdater (node, value) {
            node.innerHTML = value;
        },
        modelUpdater (node, value) {
            node.value = value;
        }
    }
}
class Compile {
    constructor(el, vm) {
        this.el = this.isElementNode(el) ? el : document.querySelector(el);
        this.vm = vm;
        // 获取文档碎片对象，放入内存中会减少页面的回流和重绘
        const fragment = this.node2Fragment(this.el);
        // console.log(fragment)

        // 编译模板
        this.compile(fragment);

        // 追加子元素到根元素上
        this.el.appendChild(fragment);
    }
    compile (fragment) {
        // 1 获取子节点
        const childNodes = fragment.childNodes;
        [...childNodes].forEach( child => {
            // console.log(child);
            if (this.isElementNode(child)) {
                // 是元素节点
                // 编译元素节点
                // console.log('元素节点', child)
                this.compileElement(child)
            }else {
                // 文本节点
                // console.log('文本节点', child)
                this.compileText(child)
            }

            if (child.childNodes && child.childNodes.length) {
                this.compile(child);
            }
        })
    }
    compileElement (node) {
        // <div v-text="msg"></div>
        const attributes = node.attributes;
        // console.log(attributes); 
        [...attributes].forEach(attr => {
            const {name, value} = attr; // name=v-text | value = msg || name=@click value=handleClick
            // console.log(name);
            if (this.isDirective(name)) { // 是指令 v-text v-model v-html v-on:click
                const [, directive] = name.split("-"); // text, model, html, on:click
                const [dirName, eventName] = directive.split(":"); // dirName -> text, model, html, on
                // 更新数据 数据驱动视图
                compileUtil[dirName](node, value, this.vm, eventName);
                // 删除有指令的标签上的属性
                node.removeAttribute('v-' + directive)
            }else if(this.isEventDirective(name)){ // 判断是否是@等监听事件
                const [, eventName] = name.split("@"); // eventDirective = click
                compileUtil['on'](node, value, this.vm, eventName);
                // 删除有指令的标签上的属性
                node.removeAttribute('@' + eventName)
            }
        })
    }
    compileText (node) {
        // 编译 {{}}
        const content = node.textContent;
        // console.log("content", content);
        if(/\{\{(.+?)\}\}/.test(content)){
            // console.log(content);
            compileUtil['text'](node, content, this.vm);
        }
    }
    // 判断是否是Vue的指令
    isDirective (attrName) {
        return attrName.startsWith("v-")
    }
    // 判断指令是否是事件 
    isEventDirective (attrName) {
        return attrName.startsWith("@")
    }
    // 判断是否是节点
    isElementNode (node) {
        return node.nodeType === 1;
    }
    node2Fragment (el) {
        // 创建文档碎片对象
        const f = document.createDocumentFragment();
        let firstChild;
        while (firstChild = el.firstChild) {
            f.append(firstChild);
        }
        return f;
    }
}

class mVue {
    constructor (options) {
        this.$el = options.el;
        this.$data = options.data;
        this.$options = options;
        if (this.$el) {
            // 1. 实现了一个数据观察者
            new Observer(this.$data);
            // 2. 实现一个指令解析器
            new Compile(this.$el, this);
        }
    }
}