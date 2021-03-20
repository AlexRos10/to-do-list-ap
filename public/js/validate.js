function validate() {
    if (document.myForm.password.value != document.myForm.password2.value) {
        alert( "Passwords do not match." );
        document.myForm.password.focus() ;
        return false;
    }
    return true;
}