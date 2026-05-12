export const Modal = {
    show: function(options) {
        const overlay = document.getElementById('custom-modal');
        const title = document.getElementById('modal-title');
        const content = document.getElementById('modal-content');
        const actions = document.getElementById('modal-actions');
        
        title.innerText = options.title || '';
        if (typeof options.content === 'string') {
            content.innerHTML = options.content;
        } else {
            content.innerHTML = '';
            content.appendChild(options.content);
        }
        
        actions.innerHTML = '';
        if (options.buttons) {
            options.buttons.forEach(b => {
                const btn = document.createElement('button');
                btn.className = b.primary ? 'btn primary' : 'btn outline';
                btn.innerText = b.text;
                btn.onclick = () => {
                    if (b.onClick) b.onClick();
                    this.hide();
                };
                actions.appendChild(btn);
            });
        }
        
        overlay.classList.add('active');
    },
    
    hide: function() {
        const overlay = document.getElementById('custom-modal');
        overlay.classList.remove('active');
    }
};
