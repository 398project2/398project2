$(function() {
    $('#add-course').click(function() {
        var lastCourse = $(this).parent().siblings('input[type=text]').last();
        var lastName = parseInt(lastCourse.attr('name'));
        var clone = lastCourse.clone();
        clone.insertAfter(lastCourse)
            .attr('name', lastName + 1)
            .focus();
        // console.log(clone);
    });
});