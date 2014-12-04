$(function() {
    $('#add-course').click(function() {
        var lastCourse = $(this).parent().siblings('.course').last();
        var lastName = parseInt(lastCourse.find('input').attr('name'));
        var clone = lastCourse.clone();
        clone.insertAfter(lastCourse)
            .find('input').attr('name', lastName + 1)
            .focus();
        // console.log(clone);
    });
});