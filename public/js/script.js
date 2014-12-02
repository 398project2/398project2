$(function() {
    $('#add-course').click(function() {
        $(this).siblings('.course').last().clone().insertBefore(this);
    });
});