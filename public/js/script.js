$(function() {
    $('#add-course').click(function() {
        var lastCourse = $(this).parent().siblings('.course').last();
        lastCourse.clone().insertAfter(lastCourse);
    });
});