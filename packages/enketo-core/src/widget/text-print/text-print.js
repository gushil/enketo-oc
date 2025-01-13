import Widget from '../../js/widget';
import events from '../../js/event';

/**
 * Clone text input fields value into new print-only element.
 * This is an unusual way to implement a feature, because it is not an actual widget,
 * but this is the easiest way to do it.
 */
class TextPrintWidget extends Widget {
    /**
     * @type {string}
     */
    static get selector() {
        // The [data-for] exclusion prevents "comment" widgets from being included.
        // It is not quite correct to do this but atm the "for" attribute in XForms is only used for comment widgets.
        return '.question:not(.or-appearance-autocomplete):not(.or-appearance-url) > input[type=text]:not(.ignore):not([data-for]), .question:not(.or-appearance-autocomplete):not(.or-appearance-url) > textarea:not(.ignore):not([data-for])';
    }

    _init() {
        this.question.addEventListener(
            events.Printify().type,
            this._addWidget.bind(this)
        );
        this.question.addEventListener(
            events.DePrintify().type,
            this._removeWidget.bind(this)
        );
    }

    _addWidget() {
        if (this.widget) {
            return;
        }

        const previousElement = this.element.previousElementSibling;
        const isDateWidget = previousElement?.classList.contains('date');

        // If previous element is a date widget, change its value to masked value
        if (isDateWidget) {
            const dateInputElement = previousElement.querySelector('input');
            if (
                dateInputElement &&
                this.element.hasAttribute('data-oc-external') &&
                this.element.getAttribute('data-oc-external') === 'contactdata'
            ) {
                const elementValue = this.element.value || '';
                dateInputElement.dataset.actualValue = elementValue;
                dateInputElement.value = elementValue ? 'MaskedXXXXXXX' : '';
                // Remove placeholder if value is empty
                if (!elementValue) {
                    dateInputElement.dataset.previousPlaceholder =
                        dateInputElement.placeholder;
                    dateInputElement.placeholder = '';
                }
            }
            return;
        }

        // Create print-only element with value from original input
        const className = 'print-input-text';
        const printElement = document.createElement('div');
        printElement.classList.add(className, 'widget');

        printElement.innerHTML = this.element.value.replace(/\n/g, '<br>');
        this.element.after(printElement);
        this.element.classList.add('print-hide');

        this.widget = printElement;
    }

    _removeWidget() {
        this.element.classList.remove('print-hide');

        const previousElement = this.element.previousElementSibling;
        const isDateWidget = previousElement?.classList.contains('date');

        // If previous element is a date widget, change its value to actual value
        if (isDateWidget) {
            const dateInputElement = previousElement.querySelector('input');
            const actualValue = dateInputElement?.dataset.actualValue;
            if (actualValue) {
                dateInputElement.value = actualValue;
                // Remove the data attribute
                delete dateInputElement.dataset.actualValue;
            }
            // Restore placeholder if it was set
            const previousPlaceholder =
                dateInputElement?.dataset.previousPlaceholder;
            if (previousPlaceholder) {
                dateInputElement.placeholder = previousPlaceholder;
                delete dateInputElement.dataset.previousPlaceholder;
            }
            return;
        }

        // Remove the print-only element
        if (this.widget) {
            this.widget.remove();
            this.widget = null;
        }
    }
}

export default TextPrintWidget;
