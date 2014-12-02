$(function() {
    $('#add-course').click(function() {
        var lastCourse = $(this).parent().siblings('.course').last();
        lastCourse.clone().find('input').attr('name', parseInt(lastCourse.find('input').attr('name')) + 1).parent().insertAfter(lastCourse);
    });
});