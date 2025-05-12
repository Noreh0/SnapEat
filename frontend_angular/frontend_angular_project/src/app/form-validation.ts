import { AbstractControl, ValidationErrors, ValidatorFn } from "@angular/forms";

export class FormValidations{

    static equalTo(otherfield : string): ValidatorFn{
        return (control : AbstractControl) : ValidationErrors | null => {
            const fieldvalue = control.value
            const otherfieldvalue = control.root.get(otherfield)?.value

            if (fieldvalue != otherfieldvalue){
                return { equalTo: true}
            }
            return null
        }
    }

}