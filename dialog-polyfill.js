// Dialog polyfill for older browsers
const dialogPolyfill = {
    registerDialog: function(dialog) {
        if (dialog.showModal) return;
        
        dialog.showModal = function() {
            dialog.style.display = 'block';
            dialog.setAttribute('open', '');
        };
        
        dialog.close = function() {
            dialog.style.display = 'none';
            dialog.removeAttribute('open');
        };
        
        // Close dialog when clicking outside
        dialog.addEventListener('click', function(e) {
            if (e.target === dialog) {
                dialog.close();
            }
        });
    }
}; 