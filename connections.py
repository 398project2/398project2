import re
import requests
from bs4 import BeautifulSoup 

def main():
    # scrapes data from wheaton website, formats it, and writes it to json 
    data = {'submit_btn' : 'Search Catalog', 'schedule_beginterm':'201510', 'subject_cat':'CONX'}
    url = 'https://weblprod1.wheatonma.edu/PROD/bzcrschd.P_OpenDoor'

    r = requests.post(url=url, data=data)

    doc = BeautifulSoup(r.content.decode('utf-8'))
    doc.prettify().encode('utf-8')

    # regex determines whether data is a connection and then classifies it by division and number of courses
    connectionNames = re.compile(r'CONX [0-9][0-9][0-9][0-9][0-9]')
    descriptions = re.compile(r'[A-Z][a-z][a-z][a-z]?[a-z]? |(or three) course connection')
    three = re.compile(r'.*(three).*')
    natural = re.compile(r'.*(BIO).* |.*(CHEM).* |.*(PHYS).* |.*(AST).* |.*(PSY).* |.*(INT).*')
    social = re.compile(r'.*(AFDS).* |.*(ECON).* |.*(ANTH).* |.*(EDUC).*|.*(FNMS).* |.*(INT).* |.*(MGMT).* |.*(POLS).* |.*(PSY).* |.*(SOC).* |.*(WGS).* |.*(WMST).*')
    humanities = re.compile(r'.*(ENG).* |.*(ARTH).* |.*(ARTS).* |.*(CLAS).* |.*(CW).* |.*(GER).* |.*(GK).* |.*(HISP).* |.*(HIST).* |.*(ITAS).* |.*(LAT).* |.*(MUSC).* |.*(PHIL).* |.*(REL).* |.*(RUSS).* |.*(THEA).* |.*(WGS).* |.*(ANTH).* |.*(FNMS).* |.*(FR).* |.*(WMST).*')
    qa = re.compile(r'.*(MATH).*')
    nameList = []
    descriptionList = []
    threeList = []
    naturalList = []
    socialList = []
    humanitiesList = []
    qaList = []
    rows = doc.find_all('tr')

    for i in range(len(rows)):
        arow = rows[i]
        content = arow.find('td').getText().encode('utf-8').strip()
        if connectionNames.match(content):
            nameList.append(str(content).replace('\'','`'))
        if descriptions.match(content):
            descriptionList.append(str(content).replace('\'','`').replace('\n', ' ').replace('THA', 'THEA').replace('PSYCH', 'PSY'))

    for i in range(len(descriptionList)):
        if three.match(descriptionList[i]):
            threeList.append("True")
        else:
            threeList.append("False")
        if natural.match(descriptionList[i]):
            naturalList.append("True")
        else:
            naturalList.append("False")
        if social.match(descriptionList[i]):
            socialList.append("True")
        else:
            socialList.append("False")
        if humanities.match(descriptionList[i]):
            humanitiesList.append("True")
        else:
            humanitiesList.append("False")
        if qa.match(descriptionList[i]):
            qaList.append("True")
        else:
            qaList.append("False")

    # gets individual course data from connections
    # formats data and writes to graph.json and connections.json
    courseNum = re.compile(r'[A-Z]{2,4} [0-9]{3}')
    orCourse = re.compile(r'([A-Z]{2,4} [0-9]{3})(?:(?!with).)* or ([A-Z]{2,4} [0-9]{3})(?:(?!with).)*| ([A-Z]{2,4} [0-9]{3})(?:(?!with).)* or ([0-9]{3})(?:(?!with).)*')
    andCourse = re.compile(r'([A-Z]{2,4} [0-9]{3})(?:(?!or).)* with ([A-Z]{2,4} [0-9]{3})(?:(?!or).)*')
    orAndCourse = re.compile(r'([A-Z]{2,4} [0-9]{3})(.*) or ([A-Z]{2,4} [0-9]{3})(.*) with ([A-Z]{2,4} [0-9]{3})(?:(?!or).)*')
    andOrCourse = re.compile(r'([A-Z]{2,4} [0-9]{3})(.*) with ([A-Z]{2,4} [0-9]{3})(.*) or ([A-Z]{2,4} [0-9]{3})(?:(?!with).)*')
    departmentList = []
    linkList = []
    newDepartment = {}
    
    # writes graph.json for d3 force-directed graph on visualize page
    with open('graph.json', 'w') as graphFile:
        graphFile.write("{\"nodes\": [\n")
        # Add Departments
        for i in xrange(len(descriptionList)):
            oneRow = descriptionList[i]
            if courseNum.search(oneRow):
                matchCourse = courseNum.findall(oneRow)
                for j in xrange(len(matchCourse)):
                    oneDepartment = matchCourse[j][0:(len(matchCourse[j])-4)]
                    if not oneDepartment in departmentList:
                        departmentList.append(str(oneDepartment))

        connectionList = []

        # Add Courses
        for i in xrange(len(descriptionList)):
            oneRow = descriptionList[i].replace('\n', ' ')
            if courseNum.search(oneRow):
                matchCourse = courseNum.findall(oneRow)
                for j in xrange(len(matchCourse)):
                    if not matchCourse[j] in departmentList:
                        departmentList.append(str(matchCourse[j]))
                        tempList = []
                        tempList.append(str(matchCourse[j][0:(len(matchCourse[j])-4)]))
                        tempList.append(str(matchCourse[j]))
                        connectionList.append(tempList)

        # Add Connections
        for i in xrange(len(descriptionList)):
            oneRow = descriptionList[i].replace('\n', ' ')
            if orCourse.search(oneRow):
                groupOne = []
                groupTwo = []
                count = 0
                matchCourse = orCourse.findall(oneRow)
                for j in xrange(len(matchCourse)):
                    oneCourse = matchCourse[j]
                    if not oneCourse in connectionList:
                        count+=1

                        if count <= (len(matchCourse) / 2):
                            someGroup = groupOne
                        else:
                            someGroup = groupTwo
                        
                        if oneCourse[0] != '':
                            someGroup.append(str(oneCourse[0]))
                            someGroup.append(str(oneCourse[1]))
                        else:
                            someGroup.append(str(oneCourse[2]))
                            someGroup.append(str(oneCourse[2][0:(len(oneCourse[2])-4)])+' '+str(oneCourse[3]))
                            departmentList.append(str(oneCourse[2][0:(len(oneCourse[2])-4)])+' '+str(oneCourse[3]))
                            tempList = []
                            tempList.append(str(oneCourse[2][0:(len(oneCourse[2])-4)])+' '+str(oneCourse[3]))
                            tempList.append(str(oneCourse[2][0:(len(oneCourse[2])-4)]))
                            connectionList.append(tempList)

                for j in xrange(len(groupOne)):
                    for k in xrange(len(groupTwo)):
                        tempList = []
                        tempList.append(groupOne[j])
                        tempList.append(groupTwo[k])
                        connectionList.append(tempList)

            elif andCourse.search(oneRow):
                matchCourse = andCourse.findall(oneRow)
                for j in xrange(len(matchCourse)):
                    oneCourse = matchCourse[j]
                    if not oneCourse in connectionList:
                        tempList = []
                        tempList.append(oneCourse[0])
                        tempList.append(oneCourse[1])
                        connectionList.append(tempList)

            if andOrCourse.search(oneRow):
                matchCourse = andOrCourse.findall(oneRow)
                for j in xrange(len(matchCourse)):
                    oneCourse = matchCourse[j]
                    tempListOne = []
                    tempListOne.append(oneCourse[0])
                    tempListOne.append(oneCourse[2])
                    if not tempListOne in connectionList:
                        connectionList.append(tempListOne)
                    tempListTwo = []
                    tempListTwo.append(oneCourse[0])
                    tempListTwo.append(oneCourse[4])
                    if not tempListTwo in connectionList:
                        connectionList.append(tempListTwo)

            if orAndCourse.search(oneRow):
                matchCourse = orAndCourse.findall(oneRow)
                for j in xrange(len(matchCourse)):
                    oneCourse = matchCourse[j]
                    tempListOne = []
                    tempListOne.append(oneCourse[0])
                    tempListOne.append(oneCourse[4])
                    if not tempListOne in connectionList:
                        connectionList.append(tempListOne)
                    tempListTwo = []
                    tempListTwo.append(oneCourse[2])
                    tempListTwo.append(oneCourse[4])
                    if not tempListTwo in connectionList:
                        connectionList.append(tempListTwo)

        for i in xrange(len(departmentList)):
            newDepartment.update({"name":departmentList[i]})
            if (i != len(departmentList)-1):
                graphFile.write('\t'+str(newDepartment).replace('\'', '"')+','+'\n')
            else:
                graphFile.write('\t'+str(newDepartment).replace('\'', '"')+'\n')

        # writes links to specify which nodes to connect in graph
        graphFile.write("],\n\"links\": [\n")

        for i in xrange(len(connectionList)):
            oneLink = {}
            sourceLocation = departmentList.index(connectionList[i][0])
            targetLocation = departmentList.index(connectionList[i][1])
            oneLink.update({"source":sourceLocation})
            oneLink.update({"target":targetLocation})
            if (i != len(connectionList)-1):
                graphFile.write('\t'+str(oneLink).replace('\'', '"')+','+'\n')
            else:
                graphFile.write('\t'+str(oneLink).replace('\'', '"')+'\n')

        graphFile.write("]}")

        # connections.json for filter page
        with open('connections.json', 'w') as outputFile:
            outputFile.write("{\"ConnectionDescriptions\": [\n")
            for i in xrange(len(nameList)-1):
                oneConnection = {}
                oneConnection.update({"CourseName":nameList[i]})
                oneConnection.update({"CourseDescription":descriptionList[i]})
                oneConnection.update({"Three":threeList[i]})
                oneConnection.update({"Natural":naturalList[i]})
                oneConnection.update({"Social":socialList[i]})
                oneConnection.update({"Humanities":humanitiesList[i]})
                oneConnection.update({"QA":qaList[i]})
                
                outputFile.write('\t'+"{\"CourseName\": \""+str(oneConnection["CourseName"]).replace('\'', '"')+"\","+'\n')
                outputFile.write('\t'+"\"CourseDescription\": \""+str(oneConnection["CourseDescription"]).replace('\'', '"')+"\","+'\n')
                outputFile.write('\t'+"\"Three\": \""+str(oneConnection["Three"]).replace('\'', '"')+"\","+'\n')
                outputFile.write('\t'+"\"Natural\": \""+str(oneConnection["Natural"]).replace('\'', '"')+"\","+'\n')
                outputFile.write('\t'+"\"Social\": \""+str(oneConnection["Social"]).replace('\'', '"')+"\","+'\n')
                outputFile.write('\t'+"\"QA\": \""+str(oneConnection["QA"]).replace('\'', '"')+"\","+'\n')

                if (i!= len(humanitiesList)-2):
                    outputFile.write('\t'+"\"Humanities\": \""+str(oneConnection["Humanities"]).replace('\'', '"')+"\"},\n\n")
                else:
                    outputFile.write('\t'+"\"Humanities\": \""+str(oneConnection["Humanities"]).replace('\'', '"')+"\"}"+'\n')
                    
            outputFile.write("]}")

if __name__ == '__main__':
    main()