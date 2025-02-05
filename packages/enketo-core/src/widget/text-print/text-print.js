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
        return '.question:not(.or-appearance-autocomplete):not(.or-appearance-url) > input[type=text]:not(.ignore):not([data-for]):not(.mask-date), .question:not(.or-appearance-autocomplete):not(.or-appearance-url) > textarea:not(.ignore):not([data-for])';
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
        this.widgetClassName = 'print-input-text';
        this.hideClassName = 'print-hide';
    }

    _isPreviousElementDateWidget() {
        return this.element.previousElementSibling?.classList.contains('date');
    }

    _addWidget() {
        if (this.widget) {
            return;
        }

        const elementValue = this.element.value;

        // If previous element is a date widget, hide it
        if (this._isPreviousElementDateWidget()) {
            this.element.previousElementSibling.classList.add(
                this.hideClassName
            );
        }

        // Create print-only element with value from elementValue
        const printElement = document.createElement('div');
        printElement.classList.add(this.widgetClassName, 'widget');
        printElement.innerHTML = elementValue.replace(/\n/g, '<br>');

        this.element.after(printElement);
        this.element.classList.add(this.hideClassName);

        this.widget = printElement;
    }

    _removeWidget() {
        this.element.classList.remove(this.hideClassName);

        // If previous element is a date widget, show it again
        if (this._isPreviousElementDateWidget()) {
            this.element.previousElementSibling.classList.remove(
                this.hideClassName
            );
        }

        // Remove the print-only element
        if (this.widget) {
            this.widget.remove();
            this.widget = null;
        }
    }
}

export default TextPrintWidget;
