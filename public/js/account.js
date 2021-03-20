function validate() {
    if (document.myForm.oldPassword.value == document.myForm.newPassword.value) {
        alert("Your the new password can't coincide with your old password.");
        document.myForm.newPassword.focus() ;
        return false;
    }

    if (document.myForm.newPassword.value != document.myForm.newPassword2.value) {
        alert("New passwords do not match.");
        document.myForm.newPassword.focus() ;
        return false;
    }

    return true;
}

function verificate() {
    var text = 'Are you sure that you want delete your account?\nThis action is irreversible\nPlease write your password'
    document.delete.password.setAttribute('value', prompt(text));
    if (document.delete.password.value) {
        form.submit();
    }
}

var generateapikey = () => {
    var request = new Request('/api/key/generate');
    fetch(request).then(function(response) {
        return response.text();
    }).then(function(apikey) {
        console.log(apikey);
        $('.apikey').empty();
        $('.apikey').append(apikey);
    });
}

var toggleToken = () => {
    $(".apikey").toggle();
}